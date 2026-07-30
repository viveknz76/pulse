import { ActionItemOwner } from "@/types";

export function actionItemOwnerLabel(
  owner: ActionItemOwner,
  teamMemberName?: string | null
): string {
  switch (owner) {
    case "MANAGER":
      return "Me";
    case "TEAM_MEMBER":
      return teamMemberName || "Team member";
    case "SHARED":
      return "Shared";
  }
}
