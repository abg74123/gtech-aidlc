import { PrismaService } from './prisma.service';

// Mock @prisma/adapter-pg to avoid real database connections
jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({
    provider: 'postgres',
    adapterName: '@prisma/adapter-pg',
  })),
}));

// Mock PrismaClient to avoid real database initialization
jest.mock('@prisma/client', () => {
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockDisconnect = jest.fn().mockResolvedValue(undefined);

  class MockPrismaClient {
    $connect = mockConnect;
    $disconnect = mockDisconnect;

    constructor(_options?: unknown) {
      // Accept options without validation
    }
  }

  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PrismaService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be an instance of PrismaService', () => {
    expect(service).toBeInstanceOf(PrismaService);
  });

  it('should have onModuleInit method', () => {
    expect(service.onModuleInit).toBeDefined();
    expect(typeof service.onModuleInit).toBe('function');
  });

  it('should have onModuleDestroy method', () => {
    expect(service.onModuleDestroy).toBeDefined();
    expect(typeof service.onModuleDestroy).toBe('function');
  });

  it('should call $connect on onModuleInit', async () => {
    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalledTimes(1);
  });

  it('should call $disconnect on onModuleDestroy', async () => {
    await service.onModuleDestroy();

    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });
});
