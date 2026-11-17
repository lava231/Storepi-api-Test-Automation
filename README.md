# StorePI API Test Automation

An API test suite for the [StorePI demo e-commerce API](https://storepi.vercel.app/docs/introduction). It uses one Postman v3 YAML collection for desktop testing and Newman runs. The core suite contains 27 requests and 36 assertions. A separate CSV suite exercises three login scenarios.

## What it tests

| Milestone | Coverage |
| --- | --- |
| 1. Smoke & Catalog | Check products, categories, and brands for HTTP 200, JSON structure, and response time under 1,500 ms. |
| 2. Authentication | Sign up with generated credentials, log in, and capture the JWT for protected requests. |
| 3. User Profile | Read the current profile, update its name, and confirm that the change persisted. |
| 4. Reviews | List reviews, then create, update, and delete a review. Verify the changes by its captured ID. |
| 5. Shopping Cart | Add two units of a product and confirm the saved quantity. |
| 6. Wishlist | Add a product and confirm that it appears in the saved wishlist. |
| 7. Purchases | Create a demo order, retrieve it by ID, and check purchase history. |
| 8. End-to-End Checkout | Sign up a fresh test account, log in, add a cart item, and verify the order created from the cart response. |

The full suite creates test accounts and demo records on StorePI. Run **1- Smoke & Catalog** for read-only checks.

## Run with Newman

The integration was tested with Node.js 24 and pnpm 11.25.0. From the repository root, install the pinned dependencies and run the suite.

```powershell
pnpm install --frozen-lockfile
pnpm test
```

The CSV suite tests valid demo credentials, an incorrect password, and a missing email field. The negative cases expect HTTP 400 and check that no session token is returned.

```powershell
pnpm run test:auth
```

The runner reads the current YAML files and converts the collection and environment to v2.1 in memory. Newman writes `StorePI_Newman_Report.html` and `StorePI_Newman_Auth_Data.html` to an `outputs` folder beside the repository by default. Set `STOREPI_REPORT_DIR` to choose a different directory. For example, PowerShell can write the main report to the ignored `reports` folder inside the repository.

```powershell
$env:STOREPI_REPORT_DIR = "./reports"
pnpm test
```

The reports omit request and response headers and bodies. A failed assertion produces a nonzero exit code even if every HTTP request completes.

## Run in Postman

1. Open the repository folder in Postman Local View and select **StorePI QA**.
2. In the collection, open **1- Smoke & Catalog** and send **List Products** to inspect the response and its assertions.
3. Run **StorePI API Test Automation** for one local iteration to run all eight milestones in order. Run **8- End-to-End Checkout** on its own to test the complete checkout with a fresh account.

The Postman CLI can also run the v3 YAML directly from the repository root.

```powershell
postman collection run "./postman/collections/StorePI API Test Automation" -e "./postman/environments/StorePI QA.environment.yaml" -n 1 --no-report-events
```

Run the three CSV cases through the Postman CLI using the separate login collection.

```powershell
postman collection run "./bonus/Authentication Data Tests" -e "./postman/environments/StorePI QA.environment.yaml" --iteration-data "./bonus/authentication_test_data.csv" -n 3 --no-report-events
```

## Repository layout

| Path | Contents |
| --- | --- |
| `postman/collections/` | The eight milestone folders and their request scripts. |
| `postman/environments/` | The StorePI QA template. Credentials, tokens, and record IDs are populated during the run. |
| `bonus/` | The CSV fixture and its login collection. |
| `scripts/run-newman.cjs` | The YAML-to-Newman runner and HTML Extra configuration. |
| `package.json` and `pnpm-lock.yaml` | Test commands and pinned dependencies. |

## Recorded live results

Newman completed all 27 core requests and passed **34 of 36 assertions**. The CSV suite passed **6 of 6**.

- **Catalog timing.** Products returned valid data in 4,268 ms against the 1,500 ms limit in the recorded Newman run.
- **Purchase history.** StorePI created a test purchase and returned it by ID. The history endpoint returned HTTP 200 without listing it.

[Postman Local View](https://learning.postman.com/docs/use/native-git/setup) · [Postman CLI collection runs](https://learning.postman.com/docs/postman-cli/postman-cli-run-collection) · [Newman](https://learning.postman.com/docs/reference/newman-cli/command-line-integration-with-newman)
