using KAIA.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Data;

public static class DbSeeder
{

    public static async Task SeedAsync(KaiaDbContext db, CancellationToken ct = default)
    {
        await SeedItemsAsync(db, ct);
        await SeedNgosAsync(db, ct);
        await SeedCausesAsync(db, ct);
        await SeedDonorsAsync(db, ct);
        await SeedDonationsAsync(db, ct);
        await SeedDistributionsAsync(db, ct);
    }

    private static async Task SeedItemsAsync(KaiaDbContext db, CancellationToken ct)
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
            Make("Alcohol wipes, box of 100",   "MD-0030", "Care",            95.00m)
        };

        db.Items.AddRange(items);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedNgosAsync(KaiaDbContext db, CancellationToken ct)
    {
        if (await db.Ngos.AnyAsync(ct)) return;

        var now = DateTime.UtcNow;

        var ngos = new List<Ngo>
        {
            new() { Name = "WWF Philippines",       Description = "Conservation organization focused on protecting the country's biodiversity.", ContactEmail = "info@wwf.org.ph",        ContactPhone = "+63 2 8926 8080", Website = "https://wwf.org.ph",                    VerificationStatus = NgoVerificationStatus.Verified, CreatedAtUtc = now.AddDays(-30) },
            new() { Name = "Angat Buhay Foundation", Description = "Community development foundation supporting education, health, and livelihood programs.", ContactEmail = "hello@angatbuhay.ph", ContactPhone = "+63 2 8123 4567", Website = "https://angatbuhay.ph",                VerificationStatus = NgoVerificationStatus.Verified, CreatedAtUtc = now.AddDays(-25) },
            new() { Name = "PAWS Philippines",      Description = "Animal welfare organization rescuing and rehabilitating stray and abused animals.", ContactEmail = "info@paws.org.ph",       ContactPhone = "+63 2 8475 7522", Website = "https://paws.org.ph",                   VerificationStatus = NgoVerificationStatus.Verified, CreatedAtUtc = now.AddDays(-20) },
            new() { Name = "Caritas Manila",        Description = "The social service arm of the Archdiocese of Manila.", ContactEmail = "caritas@caritasmanila.org.ph", ContactPhone = "+63 2 8562 0027", Website = "https://caritasmanila.org.ph",        VerificationStatus = NgoVerificationStatus.Verified, CreatedAtUtc = now.AddDays(-15) },
            new() { Name = "Greenpeace Philippines", Description = "Environmental organization campaigning for climate action and ocean protection.", ContactEmail = "info.ph@greenpeace.org",  ContactPhone = "+63 2 8890 5950", Website = "https://greenpeace.org/philippines",    VerificationStatus = NgoVerificationStatus.Pending,  CreatedAtUtc = now.AddDays(-10) },
            new() { Name = "Gawad Kalinga",         Description = "Poverty reduction movement building homes, communities, and livelihood programs.", ContactEmail = "info@gk1world.org",       ContactPhone = "+63 2 8791 5122", Website = "https://gk1world.org",                  VerificationStatus = NgoVerificationStatus.Verified, CreatedAtUtc = now.AddDays(-5) }
        };

        db.Ngos.AddRange(ngos);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedCausesAsync(KaiaDbContext db, CancellationToken ct)
    {
        if (await db.Causes.AnyAsync(ct)) return;

        var ngos = await db.Ngos.ToDictionaryAsync(n => n.Name, n => n.Id, ct);
        int NgoId(string name) => ngos.TryGetValue(name, out var id) ? id : 1;

        var now = DateTime.UtcNow;

        var causes = new List<Cause>
        {
            new() { NgoId = NgoId("Angat Buhay Foundation"), Title = "Relief Packs for Typhoon Evacuees", Description = "Emergency relief packs for families displaced by recent typhoons in Bicol and Eastern Visayas.", GoalAmount = 20000.00m, Deadline = now.AddDays(21), Status = CauseStatus.Active, CreatedAtUtc = now.AddDays(-10) },
            new() { NgoId = NgoId("Angat Buhay Foundation"), Title = "School Supplies for 500 Kids", Description = "Backpacks, notebooks, pencils, and art supplies for elementary students in underserved communities.", GoalAmount = 50000.00m, Deadline = now.AddDays(12), Status = CauseStatus.Active, CreatedAtUtc = now.AddDays(-8) },
            new() { NgoId = NgoId("Angat Buhay Foundation"), Title = "Community Learning Center Renovation", Description = "Renovating a shared learning space in Payatas to serve 200 students daily.", GoalAmount = 35000.00m, Deadline = now.AddDays(68), Status = CauseStatus.Active, CreatedAtUtc = now.AddDays(-5) },
            new() { NgoId = NgoId("PAWS Philippines"), Title = "Rescue Van Fuel Fund", Description = "Fuel for the rescue van that responds to reports of stray and abused animals across Metro Manila.", GoalAmount = 40000.00m, Deadline = now.AddDays(45), Status = CauseStatus.Active, CreatedAtUtc = now.AddDays(-7) },
            new() { NgoId = NgoId("WWF Philippines"), Title = "Coastal Cleanup Drive", Description = "Monthly cleanup drives in Manila Bay, Batangas, and Palawan to remove plastic waste from shorelines.", GoalAmount = 15000.00m, Deadline = now.AddDays(-2), Status = CauseStatus.Completed, CreatedAtUtc = now.AddDays(-60) },
            new() { NgoId = NgoId("Caritas Manila"), Title = "Feeding Program for Street Children", Description = "Hot meals served three times a week to children in Tondo and Baseco.", GoalAmount = 25000.00m, Deadline = now.AddDays(90), Status = CauseStatus.Active, CreatedAtUtc = now.AddDays(-3) },
            new() { NgoId = NgoId("Gawad Kalinga"), Title = "Housing Materials for 20 Families", Description = "Building materials for 20 homes in a resettlement community in Bulacan.", GoalAmount = 120000.00m, Deadline = now.AddDays(120), Status = CauseStatus.Active, CreatedAtUtc = now.AddDays(-2) },
            new() { NgoId = NgoId("Greenpeace Philippines"), Title = "Renewable Energy Awareness Campaign", Description = "Awareness campaign on solar and wind energy for provincial LGUs and schools.", GoalAmount = 30000.00m, Deadline = now.AddDays(-5), Status = CauseStatus.Cancelled, CreatedAtUtc = now.AddDays(-45) }
        };

        db.Causes.AddRange(causes);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedDonorsAsync(KaiaDbContext db, CancellationToken ct)
    {
        if (await db.Donors.AnyAsync(ct)) return;

        var now = DateTime.UtcNow;

        var donors = new List<Donor>
        {
            new() { Name = "Maria Santos",       Email = "maria.santos@example.ph",    Phone = "+63 917 555 0101", Type = DonorType.Individual,   CreatedAtUtc = now.AddDays(-20) },
            new() { Name = "Juan Dela Cruz",     Email = "juan.delacruz@example.ph",  Phone = "+63 917 555 0102", Type = DonorType.Individual,   CreatedAtUtc = now.AddDays(-18) },
            new() { Name = "Ana Reyes",          Email = "ana.reyes@example.ph",      Phone = "+63 917 555 0103", Type = DonorType.Individual,   CreatedAtUtc = now.AddDays(-15) },
            new() { Name = "Pedro Bautista",     Email = "pedro.bautista@example.ph", Phone = "+63 917 555 0104", Type = DonorType.Individual,   CreatedAtUtc = now.AddDays(-12) },
            new() { Name = "Bayanihan Corp",     Email = "contact@bayanihan.com.ph",  Phone = "+63 2 8888 1000",  Type = DonorType.Organization, CreatedAtUtc = now.AddDays(-30) },
            new() { Name = "Lingkod Pinoy Inc",  Email = "info@lingkodpinoy.org",     Phone = "+63 2 8888 2000",  Type = DonorType.Organization, CreatedAtUtc = now.AddDays(-25) },
            new() { Name = "Kabalikat Foundation", Email = "hello@kabalikat.ph",      Phone = "+63 2 8888 3000",  Type = DonorType.Organization, CreatedAtUtc = now.AddDays(-10) },
            new() { Name = "Sofia Mendoza",      Email = "sofia.mendoza@example.ph",  Phone = "+63 917 555 0105", Type = DonorType.Individual,   CreatedAtUtc = now.AddDays(-5) }
        };

        db.Donors.AddRange(donors);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedDonationsAsync(KaiaDbContext db, CancellationToken ct)
    {
        if (await db.Donations.AnyAsync(ct)) return;

        var donors = await db.Donors.ToDictionaryAsync(d => d.Name, d => d.Id, ct);
        var causes = await db.Causes.ToDictionaryAsync(c => c.Title, c => c.Id, ct);
        var items = await db.Items.ToDictionaryAsync(i => i.Code, i => i, ct);

        int DonorId(string name) => donors.TryGetValue(name, out var id) ? id : 1;
        int CauseId(string title) => causes.TryGetValue(title, out var id) ? id : 1;

        var now = DateTime.UtcNow;

        Donation Make(string donorName, string causeTitle, DateTime when, string? notes,
                      params (string Code, int Qty)[] lines)
        {
            var d = new Donation
            {
                DonorId = DonorId(donorName),
                CauseId = CauseId(causeTitle),
                DonatedAtUtc = when,
                Notes = notes
            };

            decimal total = 0;
            foreach (var (code, qty) in lines)
            {
                var item = items[code];
                d.Lines.Add(new DonationLine
                {
                    ItemId = item.Id,
                    Quantity = qty,
                    UnitPriceAtTimeOfDonation = item.UnitPrice
                });
                total += qty * item.UnitPrice;
            }
            d.TotalValue = total;
            return d;
        }

        var donations = new List<Donation>
        {
            Make("Bayanihan Corp", "Relief Packs for Typhoon Evacuees", now.AddDays(-8),
                 "Corporate donation for typhoon relief efforts",
                 ("FD-0055", 100), ("FD-0231", 200), ("FD-0198", 150), ("HY-0112", 50)),

            Make("Maria Santos", "School Supplies for 500 Kids", now.AddDays(-6),
                 null,
                 ("ED-0043", 300), ("ED-0021", 500), ("ED-0044", 100)),

            Make("Lingkod Pinoy Inc", "Feeding Program for Street Children", now.AddDays(-4),
                 "Quarterly sponsorship",
                 ("FD-0304", 400), ("FD-0410", 50), ("FD-0411", 80)),

            Make("Juan Dela Cruz", "Relief Packs for Typhoon Evacuees", now.AddDays(-2),
                 null,
                 ("FD-0056", 20), ("FD-0414", 100)),

            Make("Kabalikat Foundation", "Housing Materials for 20 Families", now.AddDays(-1),
                 "For the Bulacan housing project",
                 ("SH-0010", 40), ("SH-0011", 30), ("SH-0016", 25))
        };

        db.Donations.AddRange(donations);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedDistributionsAsync(KaiaDbContext db, CancellationToken ct)
    {
        if (await db.Distributions.AnyAsync(ct)) return;

        var causes = await db.Causes.ToDictionaryAsync(c => c.Title, c => c.Id, ct);
        var items = await db.Items.ToDictionaryAsync(i => i.Code, i => i, ct);

        int CauseId(string title) => causes.TryGetValue(title, out var id) ? id : 1;

        var now = DateTime.UtcNow;

        Distribution Make(string causeTitle, DateTime when, string recipient, string? notes,
                          params (string Code, int Qty)[] lines)
        {
            var d = new Distribution
            {
                CauseId = CauseId(causeTitle),
                DistributedAtUtc = when,
                Recipient = recipient,
                Notes = notes
            };

            foreach (var (code, qty) in lines)
            {
                d.Lines.Add(new DistributionLine
                {
                    ItemId = items[code].Id,
                    Quantity = qty
                });
            }
            return d;
        }

        var distributions = new List<Distribution>
        {
            Make("Relief Packs for Typhoon Evacuees", now.AddDays(-5),
                 "Barangay San Isidro, Batangas",
                 "First wave of relief distribution",
                 ("FD-0055", 40), ("FD-0231", 80)),

            Make("Relief Packs for Typhoon Evacuees", now.AddDays(-3),
                 "Barangay Mabini, Batangas",
                 "Second wave, includes hygiene kits",
                 ("FD-0055", 30), ("FD-0198", 60), ("HY-0112", 25)),

            Make("School Supplies for 500 Kids", now.AddDays(-2),
                 "Sto. Niño Elementary School",
                 "Initial delivery for Grades 1–3",
                 ("ED-0043", 150), ("ED-0021", 200)),

            Make("Feeding Program for Street Children", now.AddDays(-1),
                 "Tondo Community Kitchen",
                 null,
                 ("FD-0304", 200), ("FD-0410", 20))
        };

        db.Distributions.AddRange(distributions);
        await db.SaveChangesAsync(ct);
    }
}