/// <reference path="../../../support/index.d.ts" />

import { addSeconds } from "@commands/api/recording-tests";

describe.skip("Visits : times and recording groupings", () => {
  const Dee = "Dee_Visits";
  const group = "VisitTests";

  before(() => {
    cy.testCreateUserAndGroup(Dee, group);
  });

  it("recordings less than 10mins apart are considered a single visit", () => {
    const camera = "closeRecordings";
    cy.apiDeviceAdd(camera, group);
    cy.testUploadRecording(camera, {});
    cy.testUploadRecording(camera, { minsLater: 9 });
    cy.testUploadRecording(camera, { minsLater: 9 });
    cy.checkVisits(Dee, camera, [{ recordings: 3 }]);
  });

  it("recordings more 10mins apart are different visits", () => {
    const camera = "apartRecordings";
    cy.apiDeviceAdd(camera, group);
    cy.testUploadRecording(camera, {});
    cy.testUploadRecording(camera, { minsLater: 11 });
    cy.checkVisits(Dee, camera, [{ recordings: 1 }, { recordings: 1 }]);
  });

  it("test start and end date of visits", () => {
    const camera = "dateTimes";
    const videoStart = new Date(2021, 1, 20, 21);
    cy.apiDeviceAdd(camera, group);
    cy.testUploadRecording(camera, {
      time: videoStart,
      tracks: [
        {
          start_s: 3,
          end_s: 14,
        },
      ],
    });
    cy.checkVisits(Dee, camera, [
      { start: addSeconds(videoStart, 3), end: addSeconds(videoStart, 14) },
    ]);
  });

  it("test start and end date of visits with first track finishing later than second", () => {
    const camera = "dateTimes2";
    const videoStart = new Date(2021, 1, 20, 21);
    cy.apiDeviceAdd(camera, group);
    cy.testUploadRecording(camera, {
      time: videoStart,
      tracks: [
        {
          start_s: 3,
          end_s: 14,
        },
        {
          start_s: 5,
          end_s: 12,
        },
      ],
    });
    cy.checkVisits(Dee, camera, [
      { start: addSeconds(videoStart, 3), end: addSeconds(videoStart, 14) },
    ]);
  });

  it("test start and end date of visits with multiple videos", () => {
    const camera = "dateTimes3";
    const videoStart = new Date(2021, 1, 20, 21);
    cy.apiDeviceAdd(camera, group);
    cy.testUploadRecording(camera, {
      time: videoStart,
      tracks: [
        {
          start_s: 3,
          end_s: 14,
        },
      ],
    });
    cy.testUploadRecording(camera, {
      secsLater: 66,
      tracks: [
        {
          start_s: 5,
          end_s: 12,
        },
      ],
    });
    cy.checkVisits(Dee, camera, [
      {
        start: addSeconds(videoStart, 3),
        end: addSeconds(videoStart, 66 + 12),
      },
    ]);
  });
});
