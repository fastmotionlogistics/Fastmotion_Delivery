# Weekly Contest System DTOs Documentation

This document provides an overview of all the Data Transfer Objects (DTOs) created for the weekly contest system.

## Season Management DTOs

### CreateSeasonDto

- **File**: `libs/shared/src/dto/create-season.dto.ts`
- **Purpose**: Creating new seasons for the contest system
- **Properties**:
  - `name`: Season name
  - `description`: Season description
  - `totalWeeks`: Number of weeks in the season
  - `startDate`: Season start date
  - `prizePool`: Total prize pool in cents
  - `judgingCriteria`: Community and expert weight configuration
  - `seasonRules`: Rules for max entries, votes, and phase durations

**Note**: Entry fees are set at the individual contest level, and weekly themes are set when creating contest weeks.

### SeasonStatsDto

- **File**: `libs/shared/src/dto/season-stats.dto.ts`
- **Purpose**: Season statistics and performance metrics
- **Properties**:
  - `totalParticipants`: Total season participants
  - `totalContests`: Total contests in season
  - `completedContests`: Number of completed contests
  - `totalPrizesPaid`: Total prizes distributed
  - `averageParticipantsPerWeek`: Average weekly participation
  - `topPerformers`: Array of top performing users

## Contest Week DTOs

### CreateContestWeekDto

- **File**: `libs/shared/src/dto/create-contest-week.dto.ts`
- **Purpose**: Creating contest weeks within seasons (themes are set here)
- **Properties**:
  - `seasonId`: ID of the parent season
  - `weekNumber`: Week number within season
  - `title`: Week title
  - `theme`: Week theme (set at this level)
  - `description`: Week description (optional)
  - `weekStartDate`: Start date for the week
  - `submissionDays`: Duration of submission phase (optional)
  - `votingDays`: Duration of voting phase (optional)
  - `createdBy`: ID of creating user
  - `phaseSchedule`: Detailed phase timing (optional)
  - `weekRules`: Week-specific rules (optional)

### UpdateWeekStatisticsDto

- **File**: `libs/shared/src/dto/update-week-statistics.dto.ts`
- **Purpose**: Updating week statistics
- **Properties**: All optional fields for updating statistics
  - `totalParticipants`: Number of participants
  - `totalSubmissions`: Number of submissions
  - `totalVotes`: Number of votes cast
  - `totalRatings`: Number of ratings given
  - `averageRating`: Average submission rating
  - `prizePool`: Week's prize pool
  - `prizesDistributed`: Prizes already distributed
  - `topScore`: Highest score achieved
  - `participantRetentionRate`: Retention percentage
  - `votingParticipationRate`: Voting participation percentage

### ContestWeekResponseDto

- **File**: `libs/shared/src/dto/contest-week-response.dto.ts`
- **Purpose**: API response format for contest weeks
- **Properties**:
  - `_id`: Week's unique identifier
  - `seasonId`: Parent season ID
  - `weekNumber`: Week number
  - `theme`: Week theme
  - `description`: Week description
  - `status`: Current week status (enum)
  - `phaseSchedule`: Phase timing configuration
  - `contests`: Array of associated contest IDs
  - `statistics`: Week statistics object
  - `weekRules`: Week rules object
  - `winners`: Winner information (optional)
  - `createdAt`: Creation timestamp
  - `updatedAt`: Last update timestamp

## Contest DTOs

### CreateContestInWeekDto

- **File**: `libs/shared/src/dto/create-contest-in-week.dto.ts`
- **Purpose**: Creating individual contests within contest weeks (entry fees are set here)
- **Properties**:
  - `contestWeekId`: Parent contest week ID
  - `title`: Contest title
  - `description`: Contest description (optional)
  - `entryFee`: Entry fee in cents (set at this level)
  - `prizePool`: Contest prize pool in cents
  - `maxParticipants`: Maximum participants (optional)
  - `createdBy`: Creator user ID
  - `categoryId`: Contest category ID (optional)
  - `contestRules`: Contest-specific rules (optional)
  - `tags`: Contest tags (optional)

## Supporting DTOs

### JudgingCriteriaDto

- **Purpose**: Nested DTO for judging configuration
- **Properties**:
  - `communityWeight`: Community vote weight percentage
  - `expertWeight`: Expert judge weight percentage

### SeasonRulesDto

- **Purpose**: Nested DTO for season rules
- **Properties**:
  - `maxEntriesPerWeek`: Max entries per user per week
  - `votesPerUser`: Votes each user can cast
  - `submissionDays`: Days for submission phase
  - `votingDays`: Days for voting phase

### WeekRulesDto

- **Purpose**: Nested DTO for week-specific rules
- **Properties**:
  - `maxEntriesPerUser`: Max entries per user
  - `votesPerUser`: Votes per user
  - `minVotesToWin`: Minimum votes to be eligible
  - `expertJudgeWeight`: Expert judge weight percentage
  - `communityWeight`: Community weight percentage

### PhaseScheduleDto

- **Purpose**: Nested DTO for phase timing
- **Properties**:
  - `submissionStart`: Submission phase start
  - `submissionEnd`: Submission phase end
  - `votingStart`: Voting phase start
  - `votingEnd`: Voting phase end
  - `resultsDate`: Results processing date

### TopPerformerDto

- **Purpose**: Nested DTO for season top performers
- **Properties**:
  - `userId`: User ID
  - `username`: Username
  - `totalPoints`: Total points earned
  - `contestsWon`: Number of contests won
  - `averageRating`: Average rating across submissions

## Features

All DTOs include:

- ✅ **NestJS Swagger decorations** with `@ApiProperty()`
- ✅ **Class-validator decorations** for validation
- ✅ **Class-transformer decorations** for type conversion
- ✅ **Comprehensive examples** in Swagger documentation
- ✅ **Proper TypeScript types** with MongoDB ObjectId handling
- ✅ **Validation rules** (min/max values, required fields)
- ✅ **Optional field handling** where appropriate

## Usage

All DTOs are exported from `libs/shared/src/dto/index.ts` and can be imported like:

```typescript
import {
  CreateSeasonDto,
  CreateContestWeekDto,
  CreateContestInWeekDto,
  ContestWeekResponseDto,
} from '@ondr-workspace/shared';
```

Controllers automatically get Swagger documentation and validation when using these DTOs as parameters or return types.
