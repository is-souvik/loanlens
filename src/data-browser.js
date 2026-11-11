// Browser build of the dataset module: same logic, CSVs embedded at build time.
import { makeData } from './data-core.js';
import RAW from './raw.generated.js';
const D = makeData(RAW);
export const { CURRENCIES, FX, FX_AS_OF, SPOT, REPO, REPO_NOW, REPO_AS_OF, LENDERS, UNIVERSITIES, findUniversity, searchUniversities, findLender, fxStats, SALARY_BENCHMARKS, SOURCES } = D;
