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
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
        await context.Database.MigrateAsync();
        logger.LogInformation("Migrations applied successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Migration error.");
    }

    // Schema patch: tabla de archivos adjuntos para notas de soporte
    try
    {
        var isSqlite = context.Database.ProviderName?.Contains("Sqlite") == true;
        if (isSqlite)
        {
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS support_note_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    support_note_id INTEGER NOT NULL,
                    file_name TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (support_note_id) REFERENCES support_notes(id) ON DELETE CASCADE
                )");
        }
        else
        {
            await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'support_note_files')
                CREATE TABLE support_note_files (
                    id int IDENTITY(1,1) PRIMARY KEY,
                    support_note_id int NOT NULL,
                    file_name nvarchar(max) NOT NULL,
                    content_type nvarchar(max) NOT NULL,
                    file_path nvarchar(max) NOT NULL,
                    file_size bigint NOT NULL DEFAULT 0,
                    created_at nvarchar(max) NOT NULL,
                    FOREIGN KEY (support_note_id) REFERENCES support_notes(id) ON DELETE CASCADE
                )");
        }
        logger.LogInformation("Schema patch for support_note_files applied.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Schema patch error for support_note_files.");
    }
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

