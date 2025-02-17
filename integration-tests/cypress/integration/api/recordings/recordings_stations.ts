/// <reference path="../../../support/index.d.ts" />

describe("Stations: add and remove", () => {
  const Josie = "Josie_stations";
  const group = "add_stations";
  const forestLatLong = { lat: -43.62367659982, lng: 172.62646754804 };
  const date = "2021-05-25T09:01:00.000Z";
  const earlier = "2021-05-25T08:00:00.000Z";
  const later = "2021-05-25T10:00:00.000Z";

  before(() => {
    cy.testCreateUserAndGroup(Josie, group);
    const stations = [
      { name: "forest", lat: -43.62367659982, lng: 172.62646754804 },
      { name: "stream", lat: -43.62367659983, lng: 172.62646754804 },
    ];
    cy.apiGroupStationsUpdate(Josie, group, stations);
  });

  it.skip("recordings are assigned to the correct stations", () => {
    cy.apiDeviceAdd("in-forest", group);
    cy.testUploadRecording("in-forest", forestLatLong).thenCheckStationIs(
      Josie,
      "forest"
    );

    cy.apiDeviceAdd("in-stream", group);
    cy.testUploadRecording("in-stream", {
      lat: -43.62367659983,
      lng: 172.62646754804,
    }).thenCheckStationIs(Josie, "stream");
  });

  it("recording that is not close to any station is not assigned a station", () => {
    cy.apiDeviceAdd("neither", group);
    cy.testUploadRecording("neither", {
      lat: -43.6,
      lng: 172.6,
    }).thenCheckStationIs(Josie, "");
  });

  it("recordings in another group are not assigned a station", () => {
    const otherGroup = "Josies-other";
    const camera = "other-group";
    cy.apiGroupAdd(Josie, otherGroup);
    cy.apiDeviceAdd(camera, otherGroup);
    cy.testUploadRecording(camera, forestLatLong).thenCheckStationIs(Josie, "");
  });

  it("recordings are not updated if before date specified", () => {
    const Josie2 = "Josie2";
    const groupUpdate = "update-stations";
    const camera = "update-after";
    cy.testCreateUserGroupAndDevice(Josie2, groupUpdate, camera);
    cy.testUploadRecording(camera, {
      time: new Date(date),
      lat: -43.6,
      lng: 172.8,
    });
    cy.checkRecordingsStationIs(Josie2, "");

    const stations = [
      { name: "forest", lat: -43.62367659982, lng: 172.62646754804 },
      { name: "waterfall", lat: -43.6, lng: 172.8 },
    ];
    cy.apiGroupStationsUpdate(Josie2, groupUpdate, stations, later);
    cy.checkRecordingsStationIs(Josie2, "");
  });

  it("recordings are updated if after date specified", () => {
    const Josie3 = "Josie3";
    const camera = "update-earlier";
    const groupNotUpdate = "not-update-stations";
    cy.testCreateUserGroupAndDevice(Josie3, groupNotUpdate, camera);
    cy.testUploadRecording(camera, {
      time: new Date(date),
      lat: -43.6,
      lng: 172.8,
    });
    cy.checkRecordingsStationIs(Josie3, "");

    const stations = [
      { name: "forest", lat: -43.62367659982, lng: 172.62646754804 },
      { name: "waterfall", lat: -43.6, lng: 172.8 },
    ];
    cy.apiGroupStationsUpdate(Josie3, groupNotUpdate, stations, earlier);
    cy.checkRecordingsStationIs(Josie3, "waterfall");
  });

  it.skip("recordings will lose their station assignment if the station is removed", () => {
    const Josie4 = "Josie4";
    const camera = "update-remove";
    const groupRemove = "remove-station";
    const date = "2021-03-25T21:01:00.000Z";
    const earlier = "2021-03-25T20:01:00.000Z";
    cy.testCreateUserGroupAndDevice(Josie4, groupRemove, camera);
    const stations = [{ name: "waterfall", lat: -43.6, lng: 172.8 }];
    cy.apiGroupStationsUpdate(Josie4, groupRemove, stations, earlier);
    cy.testUploadRecording(camera, {
      time: new Date(date),
      lat: -43.6,
      lng: 172.8,
    });
    cy.checkRecordingsStationIs(Josie4, "waterfall");

    const stations2 = [
      { name: "forest", lat: -43.62367659982, lng: 172.62646754804 },
    ];
    cy.apiGroupStationsUpdate(Josie4, groupRemove, stations2, earlier);
    cy.checkRecordingsStationIs(Josie4, "");
  });
});
