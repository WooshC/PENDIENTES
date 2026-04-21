using Backend.Data;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);
builder.WebHost.UseUrls("http://*:5002");

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
    });

builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IEmailTemplateService, EmailTemplateService>();
builder.Services.AddHostedService<DatabaseBackupService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

// ── Startup: apply migrations + safe schema patches ──────────────────────────
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger  = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        // This runs all pending EF Core migrations safely.
        // If the DB was previously created with EnsureCreated(), the __EFMigrationsHistory
        // table won't exist. We handle that below.
        await context.Database.MigrateAsync();
        logger.LogInformation("Migrations applied successfully.");
    }
    catch (Exception ex) when (ex.Message.Contains("already exists") || ex.Message.Contains("duplicate"))
    {
        // Tables already exist from a prior EnsureCreated(). 
        // Mark all migrations as applied so EF Core stops complaining,
        // then patch any missing columns manually.
        logger.LogWarning("Tables already exist (EnsureCreated legacy). Seeding migration history and patching schema.");
        await SeedMigrationHistory(context, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Migration error. Attempting safe schema patch.");
    }

    // Always run safe patches — they use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
    // so they're idempotent and harmless to run on every startup.
    await ApplySafeSchemaPatches(context, logger);
}

// ── Static files setup ────────────────────────────────────────────────────────
var uploadsPath = Path.Combine(app.Environment.WebRootPath, "uploads");
if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);
var supportNotesImagesPath = Path.Combine(uploadsPath, "support-notes");
if (!Directory.Exists(supportNotesImagesPath)) Directory.CreateDirectory(supportNotesImagesPath);

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();

// ── Helpers ───────────────────────────────────────────────────────────────────

/// <summary>
/// Inserts rows into __EFMigrationsHistory for all defined migrations so that
/// EF Core treats them as already applied (needed when the DB was bootstrapped
/// with EnsureCreated instead of Migrate).
/// </summary>
static async Task SeedMigrationHistory(AppDbContext context, ILogger logger)
{
    try
    {
        // Ensure the history table exists
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                ""MigrationId"" TEXT NOT NULL CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY,
                ""ProductVersion"" TEXT NOT NULL
            );");

        var appliedMigrations = (await context.Database.GetAppliedMigrationsAsync()).ToHashSet();
        var allMigrations = context.Database.GetMigrations();

        foreach (var migration in allMigrations)
        {
            if (!appliedMigrations.Contains(migration))
            {
                await context.Database.ExecuteSqlRawAsync(
                    $"INSERT OR IGNORE INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('{migration}', '8.0.2')");
                logger.LogInformation("Seeded migration history: {Migration}", migration);
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to seed migration history");
    }
}

/// <summary>
/// Safe, idempotent DDL patches. Each statement uses IF NOT EXISTS or
/// ADD COLUMN IF NOT EXISTS so running on an up-to-date DB is harmless.
/// Add new columns/tables here instead of touching EnsureCreated().
/// </summary>
static async Task ApplySafeSchemaPatches(AppDbContext context, ILogger logger)
{
    var patches = new (string name, string sql)[]
    {
        ("ai_chat_history", @"
            CREATE TABLE IF NOT EXISTS ""ai_chat_history"" (
                ""id"" INTEGER NOT NULL CONSTRAINT ""PK_ai_chat_history"" PRIMARY KEY AUTOINCREMENT,
                ""role"" TEXT NOT NULL DEFAULT 'user',
                ""content"" TEXT NOT NULL DEFAULT '',
                ""created_at"" TEXT NOT NULL DEFAULT ''
            );"),

        ("pendiente_tasks", @"
            CREATE TABLE IF NOT EXISTS ""pendiente_tasks"" (
                ""id"" INTEGER NOT NULL CONSTRAINT ""PK_pendiente_tasks"" PRIMARY KEY AUTOINCREMENT,
                ""pendiente_id"" INTEGER NOT NULL,
                ""description"" TEXT NOT NULL DEFAULT '',
                ""completed"" INTEGER NOT NULL DEFAULT 0,
                ""created_at"" TEXT NOT NULL DEFAULT ''
            );"),

        ("support_notes", @"
            CREATE TABLE IF NOT EXISTS ""support_notes"" (
                ""id"" INTEGER NOT NULL CONSTRAINT ""PK_support_notes"" PRIMARY KEY AUTOINCREMENT,
                ""title"" TEXT NOT NULL DEFAULT 'Nota sin título',
                ""content"" TEXT NOT NULL DEFAULT '',
                ""created_at"" TEXT NOT NULL DEFAULT '',
                ""updated_at"" TEXT NOT NULL DEFAULT ''
            );"),

        ("support_note_images", @"
            CREATE TABLE IF NOT EXISTS ""support_note_images"" (
                ""id"" INTEGER NOT NULL CONSTRAINT ""PK_support_note_images"" PRIMARY KEY AUTOINCREMENT,
                ""support_note_id"" INTEGER NOT NULL,
                ""file_name"" TEXT NOT NULL DEFAULT '',
                ""content_type"" TEXT NOT NULL DEFAULT 'image/png',
                ""file_path"" TEXT NOT NULL DEFAULT '',
                ""file_size"" INTEGER NOT NULL DEFAULT 0,
                ""created_at"" TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (""support_note_id"") REFERENCES ""support_notes"" (""id"") ON DELETE CASCADE
            );"),

        // Columns that may be missing on DBs created before a migration added them
        ("pendientes.audio_file_path",
            "ALTER TABLE \"pendientes\" ADD COLUMN IF NOT EXISTS \"audio_file_path\" TEXT;"),

        ("pendientes.audio_transcription",
            "ALTER TABLE \"pendientes\" ADD COLUMN IF NOT EXISTS \"audio_transcription\" TEXT;"),

        ("pendientes.cc_emails",
            "ALTER TABLE \"pendientes\" ADD COLUMN IF NOT EXISTS \"cc_emails\" TEXT;"),
    };

    foreach (var (name, sql) in patches)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(sql);
        }
        catch (Exception ex)
        {
            // SQLite doesn't support ADD COLUMN IF NOT EXISTS on older versions;
            // swallow "duplicate column" errors silently.
            if (!ex.Message.Contains("duplicate column") && !ex.Message.Contains("already exists"))
                logger.LogWarning("Schema patch '{Name}' warning: {Msg}", name, ex.Message);
        }
    }

    logger.LogInformation("Safe schema patches completed.");
}