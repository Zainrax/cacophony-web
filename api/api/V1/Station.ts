import { Application, Request, Response } from "express";
import {
  extractJwtAuthorizedUser,
  fetchAuthorizedRequiredStationById,
  fetchAuthorizedRequiredStations,
} from "@api/extract-middleware";
import responseUtil from "@api/V1/responseUtil";
import { validateFields } from "@api/middleware";
import { param, query } from "express-validator";
import { Station } from "@models/Station";
import { ApiStationResponse } from "@typedefs/api/station";
import { idOf } from "../validation-middleware";

const mapStation = (station: Station): ApiStationResponse => {
  const stationResponse: ApiStationResponse = {
    name: station.name,
    id: station.id,
    groupId: station.GroupId,
    createdAt: station.createdAt.toISOString(),
    location: {
      lat: station.location.coordinates[0],
      lng: station.location.coordinates[1],
    },
    updatedAt: station.updatedAt.toISOString(),
    lastUpdatedById: station.lastUpdatedById,
  };
  if (station.retiredAt) {
    stationResponse.retiredAt = station.retiredAt.toISOString();
  }
  return stationResponse;
};

export const mapStations = (stations: Station[]): ApiStationResponse[] =>
  stations.map(mapStation);

export default function (app: Application, baseUrl: string) {
  const apiUrl = `${baseUrl}/stations`;

  // TODO - document
  app.get(
    apiUrl,
    extractJwtAuthorizedUser,
    validateFields([
      query("view-mode").optional().equals("user"),
      query("only-active").default(false).isBoolean().toBoolean(),
    ]),
    fetchAuthorizedRequiredStations,
    async (request: Request, response: Response) => {
      return responseUtil.send(response, {
        statusCode: 200,
        messages: ["Got stations"],
        stations: mapStations(response.locals.stations),
      });
    }
  );

  // TODO - document
  app.get(
    `${apiUrl}/:id`,
    extractJwtAuthorizedUser,
    validateFields([
      idOf(param("id")),
      query("view-mode").optional().equals("user"),
      query("only-active").default(false).isBoolean().toBoolean(),
    ]),
    fetchAuthorizedRequiredStationById(param("id")),
    async (request: Request, response: Response) => {
      return responseUtil.send(response, {
        statusCode: 200,
        messages: ["Got station"],
        stations: mapStation(response.locals.station),
      });
    }
  );
}
