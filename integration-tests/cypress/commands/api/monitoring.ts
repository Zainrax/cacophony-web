// load the global Cypress types
/// <reference types="cypress" />
/// <reference types="../types" />

import { v1ApiPath, getCreds, convertToDate } from "../server";
import { logTestDescription, prettyLog } from "../descriptions";
import { stripBackName } from "../names";
import { TestComparableVisit, TestVisitSearchParams } from "../types";

Cypress.Commands.add(
  "checkMonitoringTags",
  (userName: string, deviceName: string, expectedTags: string[]) => {
    const expectedVisits = expectedTags.map((tag) => {
      return { tag };
    });

    logTestDescription(`Check visit tags match ${prettyLog(expectedTags)}`, {
      userName,
      deviceName,
      expectedVisits,
    });

    checkMonitoringMatches(userName, deviceName, {}, expectedVisits);
  }
);

Cypress.Commands.add(
  "checkMonitoring",
  (
    userName: string,
    deviceName: string,
    expectedVisits: TestComparableVisit[],
    log = true
  ) => {
    logTestDescription(
      `Check visits match ${prettyLog(expectedVisits)}`,
      {
        userName,
        deviceName,
        expectedVisits,
      },
      log
    );

    checkMonitoringMatches(userName, deviceName, {}, expectedVisits);
  }
);

Cypress.Commands.add(
  "checkMonitoringWithFilter",
  (
    userName: string,
    deviceName: string,
    searchParams: TestVisitSearchParams,
    expectedVisits: TestComparableVisit[]
  ) => {
    logTestDescription(
      `Check monitoring visits with filter ${prettyLog(
        searchParams
      )} match ${prettyLog(expectedVisits)} `,
      {
        userName,
        deviceName,
        expectedVisits,
        searchParams,
      }
    );

    if (searchParams.from) {
      searchParams.from = convertToDate(searchParams.from).toISOString();
    }

    if (searchParams.until) {
      searchParams.until = convertToDate(searchParams.until).toISOString();
    }

    checkMonitoringMatches(userName, deviceName, searchParams, expectedVisits);
  }
);

function checkMonitoringMatches(
  userName: string,
  deviceName: string,
  specialParams: TestVisitSearchParams,
  expectedVisits: TestComparableVisit[]
) {
  const params: TestVisitSearchParams = {
    page: 1,
    "page-size": 100,
  };

  Object.assign(params, specialParams);

  if (deviceName) {
    params.devices = getCreds(deviceName).id;
  }

  cy.request({
    method: "GET",
    url: v1ApiPath("monitoring/page", params),
    headers: getCreds(userName).headers,
  }).then((response) => {
    checkResponseMatches(response, expectedVisits);
  });
}

function checkResponseMatches(
  response: Cypress.Response<any>,
  expectedVisits: TestComparableVisit[]
) {
  const responseVisits = response.body.visits;

  expect(
    responseVisits.length,
    `Number of visits is ${responseVisits.length}`
  ).to.be.equal(expectedVisits.length);
  const increasingDateResponseVisits = responseVisits.reverse();

  // pull out the bits we care about
  const responseVisitsToCompare: TestComparableVisit[] = [];
  for (let i = 0; i < expectedVisits.length; i++) {
    const expectedVisit = expectedVisits[i];
    const completeResponseVisit = increasingDateResponseVisits[i];
    const simplifiedResponseVisit: TestComparableVisit = {};

    if (expectedVisit.station) {
      simplifiedResponseVisit.station = completeResponseVisit.station;
    }

    if (expectedVisit.camera) {
      simplifiedResponseVisit.camera = stripBackName(
        completeResponseVisit.device
      );
    }

    if (expectedVisit.tag) {
      simplifiedResponseVisit.tag =
        completeResponseVisit.classification || "<none>";
    }

    if (expectedVisit.aiTag) {
      simplifiedResponseVisit.aiTag =
        completeResponseVisit.classificationAi || "<none>";
    }

    if (expectedVisit.recordings) {
      simplifiedResponseVisit.recordings =
        completeResponseVisit.recordings.length;
    }

    if (expectedVisit.start) {
      if (expectedVisit.start instanceof Date) {
        // full date
        simplifiedResponseVisit.start = completeResponseVisit.timeStart;
      } else {
        // just time
        simplifiedResponseVisit.start = new Date(
          completeResponseVisit.timeStart
        )
          .toTimeString()
          .substring(0, 5);
      }
    }

    if (expectedVisit.end) {
      simplifiedResponseVisit.end = completeResponseVisit.timeEnd;
    }

    if (expectedVisit.incomplete) {
      simplifiedResponseVisit.incomplete =
        completeResponseVisit.incomplete.toString();
    }

    responseVisitsToCompare.push(simplifiedResponseVisit);
  }
  expect(JSON.stringify(responseVisitsToCompare)).to.eq(
    JSON.stringify(expectedVisits)
  );
}
