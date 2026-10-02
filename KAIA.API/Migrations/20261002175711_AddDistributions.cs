using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KAIA.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDistributions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Distributions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CauseId = table.Column<int>(type: "int", nullable: false),
                    DistributedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Recipient = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Distributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Distributions_Causes_CauseId",
                        column: x => x.CauseId,
                        principalTable: "Causes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DistributionLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DistributionId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DistributionLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DistributionLines_Distributions_DistributionId",
                        column: x => x.DistributionId,
                        principalTable: "Distributions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DistributionLines_Items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DistributionLines_DistributionId",
                table: "DistributionLines",
                column: "DistributionId");

            migrationBuilder.CreateIndex(
                name: "IX_DistributionLines_ItemId",
                table: "DistributionLines",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Distributions_CauseId",
                table: "Distributions",
                column: "CauseId");

            migrationBuilder.CreateIndex(
                name: "IX_Distributions_DistributedAtUtc",
                table: "Distributions",
                column: "DistributedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DistributionLines");

            migrationBuilder.DropTable(
                name: "Distributions");
        }
    }
}
