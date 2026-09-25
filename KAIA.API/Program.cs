using KAIA.API.Data;
using KAIA.API.Middleware;
using KAIA.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
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
    });

// ─── EF Core (InMemory for M1 — swap to UseSqlServer in M3) ────────────────
builder.Services.AddDbContext<KaiaDbContext>(options =>
    options.UseInMemoryDatabase("KaiaDb"));

// ─── Services ──────────────────────────────────────────────────────────────
builder.Services.AddScoped<IItemService, ItemService>();

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
        Description = "RESTful API for KAIA — For Causes That Matter (M1: Donation Items).",
        Contact = new OpenApiContact { Name = "KAIA Project" }
    });
});

var app = builder.Build();

// ─── Seed the in-memory store on startup ───────────────────────────────────
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