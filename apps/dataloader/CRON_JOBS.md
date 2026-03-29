# Metro Now Dataloader - Cron Jobs

This document describes the cron job functionality implemented in the Metro Now Dataloader service.

## Overview

The dataloader service now includes a comprehensive cron job system that automatically manages database operations and health checks. The system uses `node-cron` for scheduling and provides both automatic execution and manual control via API endpoints.

## Features

### Automatic Cron Jobs

The system automatically initializes and starts three default cron jobs:

1. **Mock Data Sync** (`mock-data-sync`)
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
   - **Purpose**: Syncs mock data to the database
   - **Description**: Generates and upserts mock stops, platforms, routes, and platform-route relationships

2. **Database Cleanup** (`database-cleanup`)
   - **Schedule**: Daily at 2 AM (`0 2 * * *`)
   - **Purpose**: Cleans up old data
   - **Description**: Removes platform-route relationships older than 30 days

3. **Health Check** (`health-check`)
   - **Schedule**: Every minute (`* * * * *`)
   - **Purpose**: Performs database health checks
   - **Description**: Verifies database connectivity and logs statistics

### Mock Data Generation

The mock data generator creates realistic Prague metro system data including:

- **Stops**: Based on real Prague metro stations (Můstek, Muzeum, Národní třída, etc.)
- **Platforms**: Multiple platforms per stop with realistic coordinates
- **Routes**: Metro lines (A, B, C), bus routes (119, 207, 225), and tram routes (9, 22, 91)
- **Platform-Route Relationships**: Realistic connections between platforms and routes

## API Endpoints

### Cron Job Management

- `GET /api/cron/status` - Get status of all cron jobs
- `POST /api/cron/start/:jobName` - Start a specific cron job
- `POST /api/cron/stop/:jobName` - Stop a specific cron job
- `POST /api/cron/start-all` - Start all cron jobs
- `POST /api/cron/stop-all` - Stop all cron jobs

### Database Management

- `GET /api/database/stats` - Get database statistics
- `POST /api/database/sync-mock-data` - Manually sync mock data
- `POST /api/database/cleanup` - Manually trigger database cleanup
- `POST /api/database/health-check` - Manually trigger health check

## Usage Examples

### Check Cron Job Status
```bash
curl http://localhost:3008/api/cron/status
```

### Start All Cron Jobs
```bash
curl -X POST http://localhost:3008/api/cron/start-all
```

### Stop a Specific Job
```bash
curl -X POST http://localhost:3008/api/cron/stop/mock-data-sync
```

### Get Database Statistics
```bash
curl http://localhost:3008/api/database/stats
```

### Manually Sync Mock Data
```bash
curl -X POST http://localhost:3008/api/database/sync-mock-data
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3008)
- `NODE_ENV`: Environment (development/production)
- `DATABASE_URL`: PostgreSQL connection string (inherited from database package)

### Cron Schedule Format

The system uses standard cron format with timezone set to `Europe/Prague`:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

## Architecture

### Services

1. **CronService** (`src/services/cron.service.ts`)
   - Manages cron job lifecycle
   - Provides job control methods
   - Handles graceful shutdown

2. **DatabaseService** (`src/services/database.service.ts`)
   - Handles database operations
   - Manages mock data synchronization
   - Performs cleanup and health checks

3. **MockDataGenerator** (`src/services/mock-data-generator.ts`)
   - Generates realistic mock data
   - Creates stops, platforms, routes, and relationships
   - Provides both bulk and individual data generation

### Error Handling

- All cron jobs include try-catch error handling
- Failed jobs are logged with detailed error messages
- Database operations use transactions where appropriate
- Graceful shutdown ensures proper cleanup

### Logging

The system provides comprehensive logging:

- Job start/completion messages
- Error details for failed operations
- Database statistics and health check results
- Service lifecycle events

## Development

### Running the Service

```bash
# Development with watch mode
npm run dev:watch

# Production build and start
npm run build
npm start
```

### Testing Endpoints

The service provides several endpoints for testing:

- Health check: `GET /health`
- Service status: `GET /status`
- Cron management: `GET /api/cron/status`
- Database stats: `GET /api/database/stats`

## Dependencies

- `node-cron`: Cron job scheduling
- `express`: Web server framework
- `@metro-now/database`: Database client (Prisma)
- `@types/node-cron`: TypeScript definitions

## Future Enhancements

Potential improvements for the cron job system:

1. **Job Configuration**: Make cron schedules configurable via environment variables
2. **Job History**: Track job execution history and performance metrics
3. **Alerting**: Add email/Slack notifications for failed jobs
4. **Job Dependencies**: Support for job dependencies and conditional execution
5. **Distributed Locking**: Prevent duplicate job execution in multi-instance deployments
6. **Job Monitoring**: Web UI for monitoring and managing cron jobs
