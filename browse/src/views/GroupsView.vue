<template>
  <b-container fluid class="admin">
    <b-jumbotron class="jumbotron" fluid>
      <h1>Your groups</h1>
      <p class="lead">
        Groups link together devices with the users who can view their
        recordings. Click on a group to see its devices and users.
      </p>
    </b-jumbotron>
    <b-container class="groups-container">
      <b-row v-if="isLoading">
        <spinner />
      </b-row>
      <b-row v-else>
        <b-col class="col-md-6 col-12">
          <group-add />
          <div class="add-button-wrapper">
            <b-button
              v-b-modal.group-add
              variant="primary"
              v-b-tooltip.hover
              title="Add a new group"
              class="add-button"
            >
              <font-awesome-icon icon="plus" size="xs" />
              <span>Create group</span>
            </b-button>
          </div>
          <div v-if="hasGroups" class="group-list-wrapper">
            <b-checkbox class="filter-option" v-model="showGroupsWithNoDevices"
              >Include groups with no devices</b-checkbox
            >
            <b-list-group data-cy="groups-list">
              <b-list-group-item
                :class="[
                  'list-group-item',
                  'list-group-item-action',
                  { 'no-devices': devices.length === 0 },
                ]"
                :key="groupName"
                :to="
                  deviceOnly
                    ? {
                        name: 'group',
                        params: {
                          groupName,
                          tabName: 'limited-devices',
                        },
                      }
                    : {
                        name: 'group',
                        params: { groupName, tabName: 'devices' },
                      }
                "
                v-for="{ groupName, devices, deviceOnly } in filteredGroups"
              >
                <span>
                  <strong>{{ groupName }}</strong> -
                  <span v-if="devices.length !== 0"
                    >{{ devices.length || "No" }} device<span
                      v-if="devices.length !== 1"
                      >s</span
                    >
                  </span>
                </span>
                <font-awesome-icon
                  class="icon"
                  icon="chevron-right"
                  size="xs"
                />
              </b-list-group-item>
            </b-list-group>
          </div>
          <div v-else class="col-12 col-lg-8">
            <b-card class="no-content-placeholder">
              <h5>You don't belong to any groups yet</h5>
              <p>
                If you are setting up a device, create a group. All the devices
                you manage will be linked together through this group, so choose
                a name relating to your organisation, project or property.
              </p>
            </b-card>
          </div>
        </b-col>
        <b-col class="col-md-6 col-12">
          <MapWithPoints
            v-if="!locationsLoading && groupsByLocation.length"
            :points="groupsByLocation"
            :height="500"
            :navigate-to-point="
              (point) => ({
                name: 'group',
                params: { groupName: point.name, tabName: 'devices' },
              })
            "
          />
          <div class="map-loading" v-else-if="groupsByLocation.length">
            <b-spinner small />
            <div>&nbsp;Loading group locations</div>
          </div>
        </b-col>
      </b-row>
    </b-container>
  </b-container>
</template>

<script lang="ts">
import api from "@/api";
import Spinner from "@/components/Spinner.vue";
import GroupAdd from "@/components/Groups/GroupAdd.vue";

import { LatLng, latLng, latLngBounds } from "leaflet";
import MapWithPoints from "@/components/MapWithPoints.vue";
import { mapState } from "vuex";
import { ApiGroupResponse } from "@typedefs/api/group";
import { ApiLoggedInUserResponse } from "@typedefs/api/user";
import { ApiDeviceResponse } from "@typedefs/api/device";

interface GroupsForLocation {
  location: LatLng;
  name: string;
}

interface GroupsViewData {
  groups: ApiGroupResponse[];
  isLoading: boolean;
  locationsLoading: boolean;
  showGroupsWithNoDevices: boolean;
  locations: Record<string, GroupsForLocation>;
  requestController: AbortController;
}

const NZ_BOUNDS = latLngBounds([
  latLng(-33.6233075, 176.6248297),
  latLng(-47.5254414, 164.9880683),
]);

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
const isInNZ = (location: LatLng): boolean => {
  return NZ_BOUNDS.contains(location);
};

export default {
  name: "GroupsView",
  components: {
    MapWithPoints,
    Spinner,
    GroupAdd,
  },
  data(): GroupsViewData {
    return {
      groups: [],
      isLoading: false,
      showGroupsWithNoDevices: false,
      locationsLoading: false,
      locations: {},
      requestController: null,
    };
  },
  computed: {
    ...mapState({
      currentUser: (state): ApiLoggedInUserResponse =>
        (state as any).User.userData,
    }),
    hasGroups(): boolean {
      return this.groups.length !== 0;
    },
    groupsByLocation(): GroupsForLocation[] {
      return Object.values(this.locations);
    },
    filteredGroups(): any[] {
      if (this.showGroupsWithNoDevices) {
        return this.groups;
      }
      return this.groups.filter((group) => group.devices.length !== 0);
    },
  },
  created: function () {
    this.fetchGroups();
  },
  methods: {
    async fetchGroups() {
      this.isLoading = true;
      this.locationsLoading = true;
      {
        // TODO(jon): Error handling.

        interface GroupInfo {
          devices: ApiDeviceResponse[];
          groupName: string;
          deviceOnly: boolean;
        }

        const groups: Record<number, GroupInfo> = {};
        try {
          const [userGroups, userDevices] = await Promise.all([
            // NOTE - We only need to get groups because there can be groups with
            //  no devices - otherwise all groups would be listed in devices
            api.groups.getGroups(),
            api.device.getDevices(),
          ]);
          {
            if (userGroups.success) {
              const { result } = userGroups;
              for (const { id, groupName } of result.groups) {
                groups[id] = {
                  devices: [],
                  groupName,
                  deviceOnly: false,
                };
              }
            } else {
              // FIXME?
            }
          }
          {
            if (userDevices.success) {
              const { result } = userDevices;
              const locations = {};
              if (!result.devices.length) {
                this.showGroupsWithNoDevices = true;
              }
              for (const device of result.devices) {
                if (device.location) {
                  // TODO - Expand group bubble to encompass all devices
                  const location = latLng(
                    device.location.lat,
                    device.location.lng
                  );
                  if (isInNZ(location)) {
                    if (!locations.hasOwnProperty(location.toString())) {
                      locations[location.toString()] = {
                        location,
                        group: device.groupName,
                      };
                    }
                    const loc = locations[location.toString()];
                    loc.group = device.groupName;
                    loc.name = device.deviceName;
                  }
                }

                const { groupName, groupId } = device;
                groups[groupId] = groups[groupId] || {
                  devices: [],
                  groupName,
                  deviceOnly: true,
                };
                groups[groupId].devices.push(device);
                // Now we should be able to show the groups for those devices.
              }
              this.locations = locations;
            } else {
              // FIXME?
            }
            this.locationsLoading = false;
          }
        } catch (e) {
          // ...
        }
        this.groups = Object.values(groups).sort((a, b) =>
          a.groupName.localeCompare(b.groupName)
        );
      }
      this.isLoading = false;
    },
  },
};
</script>
<style lang="scss" scoped>
.groups-container {
  padding-top: 20px;
}
.group-list-wrapper {
  overflow-y: auto;
  border-top: 1px solid rgb(248, 249, 250);
  border-bottom: 1px solid rgb(248, 249, 250);
  max-height: calc(100vh - 350px);
  margin-bottom: 10px;
}
@media only screen and (max-width: 576px) {
  .groups-map {
    display: none;
  }
}

.list-group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  &.no-devices {
    //background: #eee;
    opacity: 0.5;
  }
}
.map-loading {
  background: #eee;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
}
.filter-option {
  margin: 10px;
}
</style>
