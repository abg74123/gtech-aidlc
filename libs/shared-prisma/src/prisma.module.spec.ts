import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
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
  class MockPrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);

    constructor(_options?: unknown) {
      // Accept options without validation
    }
  }

  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('PrismaModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide PrismaService', () => {
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(PrismaService);
  });

  it('should export PrismaService for other modules', async () => {
    // Create a consumer module that imports PrismaModule
    const consumerModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    const service = consumerModule.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });
});
