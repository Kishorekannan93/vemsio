# Vemsio VMS Tool — corrected migration build

This is a migration build based on the supplied legacy PyQt6/SQLite source, the supplied VMS workbook layout, and the role/field notes. It is **not yet certified as a complete production replacement**; verify it with your actual company project-import workbook and test database before deployment.

## What this revision corrects

- Module estimated time is read from Admin's project Excel import and shown as a read-only field when an employee/Project Leader creates a work entry. The API independently loads the estimate from the selected project/module, so a browser request cannot silently replace it.
- Project import follows the legacy Python importer column names: `Project Name`, `Estimated Time (hours)`, `Module Number`, `Delivery Date`, and optional `Start Date`.
- `Overall Estimate` rows provide the project-level total; otherwise project total is the sum of module estimates. `Total` and `Overall Estimate` rows are not imported as modules. Module numbers with a parenthetical suffix are normalised like the old Python code.
- Daily production allocation uses the legacy 08:30 cap: existing production time for that employee/date is deducted first; the new entry gets the remaining production time and any balance becomes extra time.
- Deleting an operator entry writes the legacy `DELETED` restoration record and removes the original. That record is excluded from normal views and production calculations. The next new entry can use the released capacity. Existing entries are not redistributed, matching the legacy source.
- Admin and Project Leader can edit/delete operator entries. Project Leaders can monitor the team and also create their own work entries. Employees and Project Leaders see their own work-entry history in Work Entry; the Project Leader Monitoring page shows team entries.
- The Work Entry screen displays the selected date's remaining production time, production consumed, and total extra hours. The date is selected before opening the entry form so the displayed balance and saved entry date match.
- Estimated time is read-only on create and edit. The server always keeps the imported module estimate; edits cannot overwrite it.
- Admin/Project Leader edit uses the legacy edit rule: the edited row is recalculated against a fresh 08:30 cap, independently of other rows.
- Added responsive mobile navigation, mobile card-style table rows, and clearer form labels.
- Roles: Admin, Project Leader, Employee, Accounts. Public registration is disabled.

## Important legacy details

- The legacy desktop workbook screenshot is a **user interface/report template**, not the Admin project-import spreadsheet. Admin project import uses the column headings listed above.
- The special-activity list follows the original Python source: `Office meeting`, `Celebration`, `System problem`, `Training`, `Power cut`, `Permission`, `Late`, `Project discussion`, and `Half day Leave`.
- The legacy source's normal work-entry status options are `In hand`, `Complete` (stored as `Comp`), `QC`, and `QA`.
- The legacy source does not redistribute other saved entries after a delete. It releases the deleted entry's consumed time for subsequent new entries. This build preserves that behaviour.
- The original SQLite database file was not supplied, so no existing users, projects, or history have been migrated.

## Requirements

- Node.js 20+
- MongoDB 6+ (local MongoDB or MongoDB Atlas)

## Setup

1. Extract the ZIP.
2. In `server`, copy `.env.example` to `.env` and set your MongoDB connection string and strong secrets. Do not share `.env` or screenshots containing credentials.
3. Start the backend:

```bash
cd server
npm install
npm run dev
```

4. In a second terminal, start the frontend:

```bash
cd client
npm install
npm run dev
```

5. Open `http://localhost:5173`. The backend health check is `http://localhost:5000/api/health`.
6. The first Admin is created from `ADMIN_EMP_ID` and `ADMIN_PASSWORD` in `.env`.

## Import project data

Use the first worksheet of the Excel workbook. Required columns:

| Column | Meaning |
|---|---|
| Project Name | Project grouping/name |
| Module Number | Module/model identifier |
| Estimated Time (hours) | Decimal hours for the module; e.g. 2.5 = 02:30 |
| Delivery Date | Project delivery date |
| Start Date | Optional; defaults to blank if omitted |

An optional row with `Overall Estimate` in `Module Number` supplies the total project estimate and date metadata. If omitted, total project estimate is the sum of the module estimates. Do not upload the legacy UI workbook (`VMS TOOL.xlsx`) as the project-import workbook; it is a screen/report template.

## Verification

```bash
cd server
npm test
```

The tests cover HH:MM conversion and validation, performance thresholds, 08:30 production/extra allocation, remaining-balance display (08:30 → 03:30 after a 05:00 entry), and restoration to 08:30 after deleting the only 05:00 entry. They do not replace browser/MongoDB end-to-end testing. Run `npm run build` inside `client` after dependencies install.

## Still required before production

- Validate the import using the actual live project-import Excel file used by your team.
- Verify all four roles against real acceptance scenarios.
- Verify Project Leader monitoring/report filters and Accounts dispatch/invoice/payment flows against the original workflow.
- Verify the actual employee deletion scenario with multiple saved entries; as in the original Python source, already-saved entries are not redistributed after deletion. The released capacity is used by subsequent new entries.
- Migrate existing SQLite data only after the actual `vms.db` is provided and backed up.
- Test concurrent entries for the same employee/date; the 08:30 allocation should be protected with a transaction/locking strategy before multi-user production use.
- Complete GoDaddy/server hosting and HTTPS configuration.
