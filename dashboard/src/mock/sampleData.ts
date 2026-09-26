import type { CoverageData, RiskScore, TestPlan, CoverageReport } from '../types';

// ---------------------------------------------------------------------------
// Coverage data — before state
// ---------------------------------------------------------------------------
export const mockCoverageData: CoverageData[] = [
  {
    filePath: 'src/routes/users.js',
    statements: { covered: 12, total: 48, pct: 25.0 },
    branches: { covered: 2, total: 14, pct: 14.3 },
    functions: { covered: 1, total: 5, pct: 20.0 },
    lines: { covered: 11, total: 46, pct: 23.9 },
  },
  {
    filePath: 'src/routes/products.js',
    statements: { covered: 0, total: 36, pct: 0.0 },
    branches: { covered: 0, total: 10, pct: 0.0 },
    functions: { covered: 0, total: 4, pct: 0.0 },
    lines: { covered: 0, total: 34, pct: 0.0 },
  },
  {
    filePath: 'src/routes/orders.js',
    statements: { covered: 8, total: 40, pct: 20.0 },
    branches: { covered: 2, total: 12, pct: 16.7 },
    functions: { covered: 1, total: 4, pct: 25.0 },
    lines: { covered: 8, total: 38, pct: 21.1 },
  },
  {
    filePath: 'src/middleware/auth.js',
    statements: { covered: 0, total: 18, pct: 0.0 },
    branches: { covered: 0, total: 6, pct: 0.0 },
    functions: { covered: 0, total: 1, pct: 0.0 },
    lines: { covered: 0, total: 17, pct: 0.0 },
  },
  {
    filePath: 'src/middleware/validation.js',
    statements: { covered: 0, total: 14, pct: 0.0 },
    branches: { covered: 0, total: 4, pct: 0.0 },
    functions: { covered: 0, total: 1, pct: 0.0 },
    lines: { covered: 0, total: 13, pct: 0.0 },
  },
  {
    filePath: 'src/utils/helpers.js',
    statements: { covered: 10, total: 28, pct: 35.7 },
    branches: { covered: 3, total: 8, pct: 37.5 },
    functions: { covered: 1, total: 4, pct: 25.0 },
    lines: { covered: 10, total: 27, pct: 37.0 },
  },
  {
    filePath: 'src/app.js',
    statements: { covered: 22, total: 22, pct: 100.0 },
    branches: { covered: 4, total: 4, pct: 100.0 },
    functions: { covered: 2, total: 2, pct: 100.0 },
    lines: { covered: 21, total: 21, pct: 100.0 },
  },
  {
    filePath: 'src/db.js',
    statements: { covered: 18, total: 24, pct: 75.0 },
    branches: { covered: 5, total: 8, pct: 62.5 },
    functions: { covered: 3, total: 4, pct: 75.0 },
    lines: { covered: 17, total: 23, pct: 73.9 },
  },
];

// ---------------------------------------------------------------------------
// Risk scores — sorted descending by riskScore (complexity * importCount)
// ---------------------------------------------------------------------------
export const mockRiskScores: RiskScore[] = [
  // riskScore = complexity * importCount
  { filePath: 'src/routes/orders.js',     functionName: 'placeOrder',         complexity: 5, importCount: 4, riskScore: 20, coveragePercent: 0.0 },
  { filePath: 'src/middleware/auth.js',   functionName: 'authenticate',       complexity: 5, importCount: 3, riskScore: 15, coveragePercent: 0.0 },
  { filePath: 'src/routes/users.js',      functionName: 'getUserById',        complexity: 4, importCount: 3, riskScore: 12, coveragePercent: 0.0 },
  { filePath: 'src/routes/products.js',   functionName: 'createProduct',      complexity: 4, importCount: 2, riskScore: 8,  coveragePercent: 0.0 },
  { filePath: 'src/middleware/validation.js', functionName: 'validateRequest', complexity: 4, importCount: 2, riskScore: 8, coveragePercent: 0.0 },
  { filePath: 'src/utils/helpers.js',     functionName: 'paginate',           complexity: 4, importCount: 2, riskScore: 8,  coveragePercent: 0.0 },
  { filePath: 'src/routes/orders.js',     functionName: 'updateOrderStatus',  complexity: 4, importCount: 3, riskScore: 12, coveragePercent: 0.0 },
  { filePath: 'src/routes/users.js',      functionName: 'createUser',         complexity: 3, importCount: 2, riskScore: 6,  coveragePercent: 0.0 },
  { filePath: 'src/routes/users.js',      functionName: 'updateUser',         complexity: 3, importCount: 2, riskScore: 6,  coveragePercent: 0.0 },
  { filePath: 'src/routes/products.js',   functionName: 'getAllProducts',      complexity: 3, importCount: 3, riskScore: 9,  coveragePercent: 0.0 },
  { filePath: 'src/routes/products.js',   functionName: 'updateProduct',      complexity: 3, importCount: 2, riskScore: 6,  coveragePercent: 0.0 },
  { filePath: 'src/routes/orders.js',     functionName: 'getOrderById',       complexity: 3, importCount: 2, riskScore: 6,  coveragePercent: 0.0 },
  { filePath: 'src/routes/orders.js',     functionName: 'cancelOrder',        complexity: 3, importCount: 2, riskScore: 6,  coveragePercent: 0.0 },
  { filePath: 'src/utils/helpers.js',     functionName: 'calculateDiscount',  complexity: 3, importCount: 1, riskScore: 3,  coveragePercent: 0.0 },
  { filePath: 'src/routes/users.js',      functionName: 'deleteUser',         complexity: 2, importCount: 2, riskScore: 4,  coveragePercent: 0.0 },
  { filePath: 'src/routes/products.js',   functionName: 'deleteProduct',      complexity: 2, importCount: 2, riskScore: 4,  coveragePercent: 0.0 },
  { filePath: 'src/utils/helpers.js',     functionName: 'generateId',         complexity: 2, importCount: 1, riskScore: 2,  coveragePercent: 0.0 },
].sort((a, b) => b.riskScore - a.riskScore);

// ---------------------------------------------------------------------------
// Test plans — top 5 risk functions
// ---------------------------------------------------------------------------
export const mockTestPlans: TestPlan[] = [
  {
    filePath: 'src/routes/orders.js',
    functionName: 'placeOrder',
    priority: 'high',
    estimatedLines: 28,
    testCases: [
      {
        description: 'places an order successfully with valid product and user',
        type: 'happy',
        inputs: ['userId: "user-1"', 'productId: "prod-1"', 'quantity: 2'],
        expectedOutput: '{ success: true, orderId: "<uuid>", status: "pending" }',
      },
      {
        description: 'returns error when product is out of stock',
        type: 'edge',
        inputs: ['userId: "user-1"', 'productId: "prod-out-of-stock"', 'quantity: 1'],
        expectedOutput: '{ success: false, error: "Product out of stock" }',
      },
      {
        description: 'throws when userId is missing',
        type: 'error',
        inputs: ['userId: undefined', 'productId: "prod-1"', 'quantity: 1'],
        expectedOutput: 'throws Error("userId is required")',
      },
    ],
  },
  {
    filePath: 'src/middleware/auth.js',
    functionName: 'authenticate',
    priority: 'high',
    estimatedLines: 22,
    testCases: [
      {
        description: 'passes middleware with a valid JWT token',
        type: 'happy',
        inputs: ['req.headers.authorization: "Bearer valid.jwt.token"'],
        expectedOutput: 'calls next() with req.user populated',
      },
      {
        description: 'returns 401 when token is expired',
        type: 'edge',
        inputs: ['req.headers.authorization: "Bearer expired.jwt.token"'],
        expectedOutput: 'res.status(401).json({ error: "Token expired" })',
      },
      {
        description: 'returns 401 when Authorization header is absent',
        type: 'error',
        inputs: ['req.headers.authorization: undefined'],
        expectedOutput: 'res.status(401).json({ error: "No token provided" })',
      },
    ],
  },
  {
    filePath: 'src/routes/users.js',
    functionName: 'getUserById',
    priority: 'high',
    estimatedLines: 18,
    testCases: [
      {
        description: 'returns user object for a valid id',
        type: 'happy',
        inputs: ['req.params.id: "user-1"'],
        expectedOutput: 'res.status(200).json({ id: "user-1", name: "Alice" })',
      },
      {
        description: 'returns 404 for a non-existent user',
        type: 'edge',
        inputs: ['req.params.id: "user-999"'],
        expectedOutput: 'res.status(404).json({ error: "User not found" })',
      },
      {
        description: 'returns 400 when id param is missing',
        type: 'error',
        inputs: ['req.params.id: undefined'],
        expectedOutput: 'res.status(400).json({ error: "id is required" })',
      },
    ],
  },
  {
    filePath: 'src/routes/orders.js',
    functionName: 'updateOrderStatus',
    priority: 'high',
    estimatedLines: 20,
    testCases: [
      {
        description: 'updates order status to shipped successfully',
        type: 'happy',
        inputs: ['req.params.id: "order-1"', 'req.body.status: "shipped"'],
        expectedOutput: 'res.status(200).json({ id: "order-1", status: "shipped" })',
      },
      {
        description: 'ignores transition to same status',
        type: 'edge',
        inputs: ['req.params.id: "order-1"', 'req.body.status: "pending"'],
        expectedOutput: 'res.status(200).json({ message: "No change" })',
      },
      {
        description: 'returns 422 for invalid status value',
        type: 'error',
        inputs: ['req.params.id: "order-1"', 'req.body.status: "flying"'],
        expectedOutput: 'res.status(422).json({ error: "Invalid status" })',
      },
    ],
  },
  {
    filePath: 'src/routes/products.js',
    functionName: 'getAllProducts',
    priority: 'medium',
    estimatedLines: 16,
    testCases: [
      {
        description: 'returns paginated list of all products',
        type: 'happy',
        inputs: ['req.query.page: "1"', 'req.query.limit: "10"'],
        expectedOutput: 'res.status(200).json({ products: [...], total: 4, page: 1 })',
      },
      {
        description: 'returns empty array when no products exist',
        type: 'edge',
        inputs: ['req.query.page: "1"', 'req.query.limit: "10"'],
        expectedOutput: 'res.status(200).json({ products: [], total: 0, page: 1 })',
      },
      {
        description: 'returns 400 for negative page number',
        type: 'error',
        inputs: ['req.query.page: "-1"', 'req.query.limit: "10"'],
        expectedOutput: 'res.status(400).json({ error: "Invalid page" })',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Coverage report — before + after
// ---------------------------------------------------------------------------
const afterCoverageData: CoverageData[] = [
  {
    filePath: 'src/routes/users.js',
    statements: { covered: 40, total: 48, pct: 83.3 },
    branches: { covered: 11, total: 14, pct: 78.6 },
    functions: { covered: 4, total: 5, pct: 80.0 },
    lines: { covered: 38, total: 46, pct: 82.6 },
  },
  {
    filePath: 'src/routes/products.js',
    statements: { covered: 28, total: 36, pct: 77.8 },
    branches: { covered: 8, total: 10, pct: 80.0 },
    functions: { covered: 3, total: 4, pct: 75.0 },
    lines: { covered: 26, total: 34, pct: 76.5 },
  },
  {
    filePath: 'src/routes/orders.js',
    statements: { covered: 32, total: 40, pct: 80.0 },
    branches: { covered: 9, total: 12, pct: 75.0 },
    functions: { covered: 3, total: 4, pct: 75.0 },
    lines: { covered: 30, total: 38, pct: 78.9 },
  },
  {
    filePath: 'src/middleware/auth.js',
    statements: { covered: 18, total: 18, pct: 100.0 },
    branches: { covered: 6, total: 6, pct: 100.0 },
    functions: { covered: 1, total: 1, pct: 100.0 },
    lines: { covered: 17, total: 17, pct: 100.0 },
  },
  {
    filePath: 'src/middleware/validation.js',
    statements: { covered: 14, total: 14, pct: 100.0 },
    branches: { covered: 4, total: 4, pct: 100.0 },
    functions: { covered: 1, total: 1, pct: 100.0 },
    lines: { covered: 13, total: 13, pct: 100.0 },
  },
  {
    filePath: 'src/utils/helpers.js',
    statements: { covered: 22, total: 28, pct: 78.6 },
    branches: { covered: 6, total: 8, pct: 75.0 },
    functions: { covered: 3, total: 4, pct: 75.0 },
    lines: { covered: 21, total: 27, pct: 77.8 },
  },
  {
    filePath: 'src/app.js',
    statements: { covered: 22, total: 22, pct: 100.0 },
    branches: { covered: 4, total: 4, pct: 100.0 },
    functions: { covered: 2, total: 2, pct: 100.0 },
    lines: { covered: 21, total: 21, pct: 100.0 },
  },
  {
    filePath: 'src/db.js',
    statements: { covered: 24, total: 24, pct: 100.0 },
    branches: { covered: 8, total: 8, pct: 100.0 },
    functions: { covered: 4, total: 4, pct: 100.0 },
    lines: { covered: 23, total: 23, pct: 100.0 },
  },
];

// before avg functions pct = (20+0+25+0+0+25+100+75)/8 = 245/8 = 30.625
// after avg functions pct  = (80+75+75+100+100+75+100+100)/8 = 705/8 = 88.125
// delta = 88.125 - 30.625 = 57.5  → round to 1 dp => 57.5
export const mockReport: CoverageReport = {
  timestamp: '2024-04-15T09:30:00.000Z',
  projectPath: '/workspace/sample-app',
  before: mockCoverageData,
  after: afterCoverageData,
  delta: 57.5,
  filesImproved: [
    'src/routes/users.js',
    'src/routes/products.js',
    'src/routes/orders.js',
    'src/middleware/auth.js',
    'src/middleware/validation.js',
    'src/utils/helpers.js',
    'src/db.js',
  ],
  functionsNewlyCovered: [
    'getUserById',
    'createUser',
    'updateUser',
    'deleteUser',
    'getAllProducts',
    'createProduct',
    'updateProduct',
    'deleteProduct',
    'placeOrder',
    'getOrderById',
    'updateOrderStatus',
    'cancelOrder',
    'authenticate',
    'validateRequest',
    'formatDate',
    'calculateDiscount',
    'generateId',
    'paginate',
  ],
};

// ---------------------------------------------------------------------------
// Trend data
// ---------------------------------------------------------------------------
export const mockTrendData: Array<{ week: string; coverage: number }> = [
  { week: 'Week 1', coverage: 28 },
  { week: 'Week 2', coverage: 35 },
  { week: 'Week 3', coverage: 47 },
  { week: 'Week 4', coverage: 61 },
  { week: 'Week 5', coverage: 74 },
  { week: 'Week 6', coverage: 87 },
];

// ---------------------------------------------------------------------------
// Generation progress
// ---------------------------------------------------------------------------
export const mockGenerationProgress: Array<{
  module: string;
  status: 'complete' | 'running' | 'pending';
  testsGenerated: number;
  timeMs: number;
}> = [
  { module: 'src/routes/orders.js',          status: 'complete', testsGenerated: 12, timeMs: 1840 },
  { module: 'src/middleware/auth.js',         status: 'complete', testsGenerated: 8,  timeMs: 1230 },
  { module: 'src/routes/users.js',            status: 'running',  testsGenerated: 6,  timeMs: 980  },
  { module: 'src/routes/products.js',         status: 'pending',  testsGenerated: 0,  timeMs: 0    },
  { module: 'src/middleware/validation.js',   status: 'pending',  testsGenerated: 0,  timeMs: 0    },
];
