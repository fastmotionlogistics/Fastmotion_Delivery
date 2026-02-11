import {
  StagedElection,
  StageOne,
  StageOneCandidateRequirementResponse,
  StageThree,
  StageThreeCandidateRequirementResponse,
  StageTwo,
  StageTwoCandidateRequirementResponse,
  User,
} from '../models';

// Define interfaces for the data structure
// interface User {
//   id?: number;
//   userName: string;
//   firstName: string;
//   lastName: string;
//   email: string;
// }

// interface Stage {
//   id: number;
//   title: string;
//   startDate: string;
//   requirements?: Requirement;
// }

interface Candidate {
  id: number;
  isActive: boolean;
  user: User;
}

interface WinnerOutput {
  electionId: number;
  electionName: string;
  stage: string;
  winnerId: number;
  order: number;
  createdAt: string;
  stageTitle: string;
  stageStartDate: string | Date;
  responses:
    | StageOneCandidateRequirementResponse[]
    | StageTwoCandidateRequirementResponse[]
    | StageThreeCandidateRequirementResponse[];
}

interface Response {
  id: number;
  response: string;
  responseType: string;
  responseVideoThumbnail: string | null;
  createdAt: string;
  candidate: Candidate;
}

interface Requirement {
  id: number;
  requirementType: string;
  maxVideoDurationInSeconds: number;
  response?: Response[];
}

function reshapeStagedWiningElectionData(user: User, data: StagedElection[]) {
  const winners: WinnerOutput[] = [];

  data.forEach((election) => {
    // Helper function to extract winners
    const extractWinner = (
      stageWinner: any[],
      stageKey: 'stageOne' | 'stageTwo' | 'stageThree',
      stage?: StageOne | StageTwo | StageThree,
    ) => {
      stageWinner.forEach((winner) => {
        const candidate = winner[`${stageKey}Candidate`];
        if (candidate?.user?.id === user?.id) {
          // Find responses for this user in stageOne requirements
          let userResponses:
            | StageOneCandidateRequirementResponse[]
            | StageTwoCandidateRequirementResponse[]
            | StageThreeCandidateRequirementResponse[] = [];
          if (
            (stageKey === 'stageOne' || stageKey === 'stageTwo' || stageKey === 'stageThree') &&
            stage?.requirements?.response
          ) {
            userResponses = stage.requirements.response
              .filter((resp) => resp.candidate.user.id === user.id)
              .map((resp) => ({
                responseId: resp.id,
                responseUrl: resp.response,
                responseType: resp.responseType,
                responseVideoThumbnail: resp.responseVideoThumbnail,
                createdAt: resp.createdAt,
              }));
          }

          winners.push({
            electionId: election.id,
            electionName: election.name,
            stage: stageKey,
            winnerId: winner.id,
            order: winner.order,
            createdAt: winner.createdAt,
            stageTitle: stage?.title ?? '',
            stageStartDate: stage?.startDate ?? '',
            responses: userResponses,
          });
        }
      });
    };

    // Process each stage
    if (election.stageOneWinner) {
      extractWinner(election.stageOneWinner, 'stageOne', election.stageOneWinner[0]?.stageOne);
    }
    if (election.stageTwoWinner) {
      extractWinner(election.stageTwoWinner, 'stageTwo', election.stageTwoWinner[0]?.stageTwo);
    }
    if (election.stageThreeWinner) {
      extractWinner(election.stageThreeWinner, 'stageThree', election.stageThreeWinner[0]?.stageThree);
    }
  });

  // Sort by createdAt in descending order (latest first)
  return winners.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
