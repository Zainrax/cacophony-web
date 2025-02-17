import { EndUserAgreementVersion, UserId } from "./common";
import { UserGlobalPermission } from "./consts";

export interface ApiUserResponse {
  userName: string; // Username of user
  id: UserId; // Unique id of user
}

export interface ApiLoggedInUserResponse extends ApiUserResponse {
  email: string;
  firstName?: string;
  lastName?: string;
  globalPermission: UserGlobalPermission;
  endUserAgreement: EndUserAgreementVersion;
}
