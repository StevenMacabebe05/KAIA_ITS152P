using KAIA.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Data;

/// <summary>
/// Seeds realistic Philippine donation-drive data on startup if the store is empty.
/// Runs against InMemory in M1; the same method seeds SQL Server in M3 unchanged.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(KaiaDbContext db, CancellationToken ct = default)
    {
        if (await db.Items.AnyAsync(ct)) return;

        var now = DateTime.UtcNow;
        int day = 1;

        Item Make(string name, string code, string brand, decimal price)
            => new Item
            {
                Name = name,
                Code = code,
                Brand = brand,
                UnitPrice = price,
                CreatedAtUtc = now.AddDays(-day++)
            };

        var items = new List<Item>
        {
            // ═══ Food (FD) — 14 items ═══════════════════════════════════
            Make("Canned sardines 155g",        "FD-0231", "555",             28.00m),
            Make("Canned corned beef 150g",     "FD-0198", "CDO",             42.00m),
            Make("Instant noodles 55g",         "FD-0304", "Lucky Me",        15.00m),
            Make("Rice, 5kg pack",              "FD-0055", "Local Supplier", 320.00m),
            Make("Rice, 25kg sack",             "FD-0056", "Local Supplier", 1450.00m),
            Make("Cooking oil 1L",              "FD-0410", "Minola",          85.00m),
            Make("Sugar, 1kg pack",             "FD-0411", "Bourbon",         68.00m),
            Make("Coffee 3-in-1, box of 30",    "FD-0412", "Kopiko",         120.00m),
            Make("Powdered milk 300g",          "FD-0413", "Bear Brand",     155.00m),
            Make("Canned tuna 155g",            "FD-0414", "Century",         38.00m),
            Make("Bread loaf",                  "FD-0415", "Gardenia",        55.00m),
            Make("Peanut butter 340g",          "FD-0416", "Lily's",         145.00m),
            Make("Dried fish (tuyo) 250g",      "FD-0417", "Local Supplier", 185.00m),
            Make("Salt, 500g pack",             "FD-0418", "Refina",          25.00m),

            // ═══ Hygiene (HY) — 12 items ═════════════════════════════════
            Make("Rubbing alcohol 500ml",       "HY-0112", "Green Cross",     65.00m),
            Make("Bath soap 90g",               "HY-0089", "Safeguard",       18.50m),
            Make("Shampoo sachet, pack of 12",  "HY-0090", "Palmolive",       54.00m),
            Make("Toothpaste 100g",             "HY-0091", "Colgate",         95.00m),
            Make("Toothbrush, adult",           "HY-0092", "Oral-B",          45.00m),
            Make("Sanitary pads, pack of 8",    "HY-0093", "Whisper",         72.00m),
            Make("Face mask, box of 50",        "HY-0094", "Indoplas",       135.00m),
            Make("Hand sanitizer 250ml",        "HY-0095", "Bactidol",        98.00m),
            Make("Detergent powder 1kg",        "HY-0096", "Tide",           128.00m),
            Make("Laundry soap bar",            "HY-0097", "Perla",           32.00m),
            Make("Cotton buds, pack of 100",    "HY-0098", "Johnson's",       22.00m),
            Make("Baby wipes, pack of 3",       "HY-0099", "Pampers",        175.00m),

            // ═══ Education (ED) — 10 items ═══════════════════════════════
            Make("School notebook, 80 leaves",  "ED-0043", "Vibal",           22.50m),
            Make("Ballpoint pen, black",        "ED-0021", "Panda",            6.00m),
            Make("Pencil, no. 2",               "ED-0022", "Mongol",           8.00m),
            Make("Crayons, 24 colors",          "ED-0023", "Crayola",         95.00m),
            Make("Pad paper, pack of 10",       "ED-0044", "Corona",          35.00m),
            Make("Backpack, student",           "ED-0045", "Hawk",           450.00m),
            Make("Coloring book",               "ED-0046", "National",        45.00m),
            Make("Glue stick",                  "ED-0047", "Elmer's",         28.00m),
            Make("Ruler, 12 inch",              "ED-0048", "Maped",           18.00m),
            Make("Art paper pad",               "ED-0049", "Canson",          65.00m),

            // ═══ Shelter (SH) — 10 items ═════════════════════════════════
            Make("Single-size blanket",         "SH-0010", "Local Supplier", 180.00m),
            Make("Banig (woven mat)",           "SH-0011", "Local Supplier", 120.00m),
            Make("Mosquito net, single",        "SH-0012", "Local Supplier", 220.00m),
            Make("Pillow, standard",            "SH-0013", "Uratex",         240.00m),
            Make("Foldable tent, 2-person",     "SH-0014", "Coleman",       2800.00m),
            Make("Sleeping bag",                "SH-0015", "Naturehike",     850.00m),
            Make("Flashlight (LED)",            "SH-0016", "Eveready",       175.00m),
            Make("Emergency whistle",           "SH-0017", "Coghlan's",       45.00m),
            Make("Thermal blanket",             "SH-0018", "Local Supplier", 320.00m),
            Make("Storage container, 20L",      "SH-0019", "Lion Star",      380.00m),

            // ═══ Medical (MD) — 12 items ═════════════════════════════════
            Make("First aid kit, basic",        "MD-0007", "St. Luke's",     250.00m),
            Make("Paracetamol 500mg, 20 tabs",  "MD-0020", "Biogesic",        45.00m),
            Make("Oral rehydration salts",      "MD-0021", "Hydrite",         12.00m),
            Make("Cotton balls 100g",           "MD-0022", "Care",            38.00m),
            Make("Adhesive bandages, 20 pcs",   "MD-0023", "Band-Aid",        55.00m),
            Make("Digital thermometer",         "MD-0024", "Omron",          380.00m),
            Make("Face shield, pack of 5",      "MD-0025", "Indoplas",       125.00m),
            Make("Betadine 120ml",              "MD-0026", "Mundipharma",    145.00m),
            Make("Medical gloves, box of 100",  "MD-0027", "Ansell",         285.00m),
            Make("Nebulizer (portable)",        "MD-0028", "Omron",         1850.00m),
            Make("Blood pressure monitor",      "MD-0029", "Omron",         1200.00m),
            Make("Alcohol wipes, box of 100",   "MD-0030", "Care",            95.00m),
        };

        db.Items.AddRange(items);
        await db.SaveChangesAsync(ct);
    }
}