using System.Text.Json.Serialization;
using KAIA.API.Data;
using KAIA.API.Middleware;
using KAIA.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// ─── Controllers + JSON ────────────────────────────────────────────────────
builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;

        // Serialize enums as strings — e.g. "Verified" not 1
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// ─── EF Core — SQL Server (LocalDB) ────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("KaiaDb")
    ?? throw new InvalidOperationException("Connection string 'KaiaDb' was not found in appsettings.json.");

builder.Services.AddDbContext<KaiaDbContext>(options =>
    options.UseSqlServer(connectionString));

// ─── Services ──────────────────────────────────────────────────────────────

builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<INgoService, NgoService>();
builder.Services.AddScoped<ICauseService, CauseService>();
builder.Services.AddScoped<IDonorService, DonorService>();
builder.Services.AddScoped<IDonationService, DonationService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IDistributionService, DistributionService>();
builder.Services.AddScoped<IReportService, ReportService>();

// ─── CORS for the Angular dev server ───────────────────────────────────────
const string AngularCorsPolicy = "AngularDev";
builder.Services.AddCors(options =>
{
    options.AddPolicy(AngularCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ─── Swagger / OpenAPI ─────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "KAIA API",
        Version = "v1",
        Description = "RESTful API for KAIA — For Causes That Matter (M2: Donation & Inventory Management).",
        Contact = new OpenApiContact { Name = "KAIA Project" }
    });
});

var app = builder.Build();

// ─── Seed the database on first run ────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<KaiaDbContext>();
    await DbSeeder.SeedAsync(db);
}

// ─── Middleware pipeline ───────────────────────────────────────────────────
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "KAIA API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors(AngularCorsPolicy);
app.UseAuthorization();
app.MapControllers();

app.Run();