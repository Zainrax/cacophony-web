<template>
  <div>
    <Hero />
    <b-container class="card-container">
      <b-card>
        <div v-if="hasLoaded">
          <b-row align-h="center">
            <b-col cols="12">
              <h1 v-if="hasGroups">Kia ora {{ userName }}</h1>
              <div v-else class="text-center py-5">
                <h2>It looks like you're new here</h2>
                <h5>
                  You're not part of any groups yet - you won't be able to see
                  any recordings until you join a group
                </h5>
              </div>
            </b-col>
          </b-row>

          <b-row>
            <b-col cols="12" md="6" class="mb-3">
              <HomeGroups v-if="hasGroups" :groups="groups" />
              <b-card v-else title="Setting up your own device?">
                Create a group for your devices. Groups allow you to manage
                devices, users, and consolidate all the information about
                recordings in one handy place<br />
                <b-button variant="primary" class="mt-3" to="/groups"
                  >Create a group</b-button
                >
              </b-card>
            </b-col>
            <b-col cols="12" md="6">
              <HomeUser v-if="hasGroups" />
              <b-card v-else title="Join a group">
                <p>
                  Want to be part of a group and monitor recordings? Contact the
                  person responsible for managing the devices and ask them to
                  add you to the devices' group.
                </p>
                <p>
                  They will need your Cacophony username:
                  <strong>{{ userName }}</strong
                  ><br />
                </p>
                <p class="mb-0">
                  Once they've done it, you'll be able to see your groups here
                  and view their recordings
                </p>
              </b-card>
            </b-col>
          </b-row>
        </div>
        <div v-else class="p-5">
          <Spinner />
          <p class="text-center m-1 text-muted small">
            Getting everything ready
          </p>
        </div>
      </b-card>
    </b-container>
  </div>
</template>

<script lang="ts">
import { mapState } from "vuex";
import api from "@/api";
import HomeGroups from "@/components/HomeGroups.vue";
import HomeUser from "@/components/HomeUser.vue";
import Hero from "@/components/Hero.vue";
import Spinner from "@/components/Spinner.vue";

export default {
  name: "HomeView",
  components: {
    Hero,
    HomeGroups,
    HomeUser,
    Spinner,
  },
  data() {
    return {
      hasLoaded: false,
      groups: [],
    };
  },
  computed: {
    ...mapState({
      userName: (state) => (state as any).User.userData.userName,
    }),
    hasGroups() {
      return this.groups.length !== 0;
    },
  },
  async created() {
    await this.fetchGroups();
  },
  methods: {
    async fetchGroups() {
      this.hasLoaded = false;
      try {
        const {
          result: { groups },
        } = await api.groups.getGroups();
        this.groups = groups;
      } catch (e) {
        // Handle this at a component level, or boot it up to a global error.
      }
      this.hasLoaded = true;
    },
  },
};
</script>

<style scoped>
.card-container {
  padding-bottom: 2em;
  position: relative;
  padding-left: 0;
  padding-right: 0;
}

/* Large screens */
@media only screen and (min-width: 768px) {
  .card-container {
    top: -15vh;
  }
}
</style>
