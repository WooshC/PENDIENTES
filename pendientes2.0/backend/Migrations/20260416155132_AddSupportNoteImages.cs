using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportNoteImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "support_note_images",
                columns: table => new
                {
                    id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    support_note_id = table.Column<int>(type: "INTEGER", nullable: false),
                    file_name = table.Column<string>(type: "TEXT", nullable: false),
                    content_type = table.Column<string>(type: "TEXT", nullable: false),
                    file_path = table.Column<string>(type: "TEXT", nullable: false),
                    file_size = table.Column<long>(type: "INTEGER", nullable: false),
                    created_at = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_note_images", x => x.id);
                    table.ForeignKey(
                        name: "FK_support_note_images_support_notes_support_note_id",
                        column: x => x.support_note_id,
                        principalTable: "support_notes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_support_note_images_support_note_id",
                table: "support_note_images",
                column: "support_note_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "support_note_images");
        }
    }
}
