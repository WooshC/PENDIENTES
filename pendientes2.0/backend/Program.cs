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
app.UseDefaultFiles();
app.UseStaticFiles();
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
}

app.Run();
