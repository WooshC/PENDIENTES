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

// Crear carpeta uploads antes de usar StaticFiles
var uploadsPath = Path.Combine(builder.Environment.WebRootPath, "uploads");
if (!Directory.Exists(uploadsPath))
    Directory.CreateDirectory(uploadsPath);

// Crear subcarpeta para imágenes de notas de soporte
var supportNotesImagesPath = Path.Combine(uploadsPath, "support-notes");
if (!Directory.Exists(supportNotesImagesPath))
    Directory.CreateDirectory(supportNotesImagesPath);

app.UseDefaultFiles();
app.UseStaticFiles(); // Permite acceso directo a wwwroot/uploads si se configura
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    context.Database.EnsureCreated();
    
    context.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""ai_chat_history"" (
            ""id"" INTEGER NOT NULL CONSTRAINT ""PK_ai_chat_history"" PRIMARY KEY AUTOINCREMENT,
            ""role"" TEXT NOT NULL,
            ""content"" TEXT NOT NULL,
            ""created_at"" TEXT NOT NULL
        );
    ");

    // New table for pendiente tasks
    context.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""pendiente_tasks"" (
            ""id"" INTEGER NOT NULL CONSTRAINT ""PK_pendiente_tasks"" PRIMARY KEY AUTOINCREMENT,
            ""pendiente_id"" INTEGER NOT NULL,
            ""description"" TEXT NOT NULL,
            ""completed"" INTEGER NOT NULL DEFAULT 0,
            ""created_at"" TEXT NOT NULL
        );
    ");

    // New table for support notes (si no existe)
    context.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""support_notes"" (
            ""id"" INTEGER NOT NULL CONSTRAINT ""PK_support_notes"" PRIMARY KEY AUTOINCREMENT,
            ""title"" TEXT NOT NULL DEFAULT 'Nota sin título',
            ""content"" TEXT NOT NULL DEFAULT '',
            ""created_at"" TEXT NOT NULL,
            ""updated_at"" TEXT NOT NULL
        );
    ");

    // New table for support note images
    context.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""support_note_images"" (
            ""id"" INTEGER NOT NULL CONSTRAINT ""PK_support_note_images"" PRIMARY KEY AUTOINCREMENT,
            ""support_note_id"" INTEGER NOT NULL,
            ""file_name"" TEXT NOT NULL DEFAULT '',
            ""content_type"" TEXT NOT NULL DEFAULT 'image/png',
            ""file_path"" TEXT NOT NULL DEFAULT '',
            ""file_size"" INTEGER NOT NULL DEFAULT 0,
            ""created_at"" TEXT NOT NULL,
            FOREIGN KEY (""support_note_id"") REFERENCES ""support_notes"" (""id"") ON DELETE CASCADE
        );
    ");
}

app.Run();