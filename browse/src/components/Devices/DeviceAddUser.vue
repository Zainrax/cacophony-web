<template>
  <b-modal
    id="device-add-user"
    ref="add-user-dialog"
    title="Add user to device"
    @ok="addUser"
    @shown="setFocusAndReset"
    ok-title="Add"
    :ok-disabled="isDisabled"
  >
    <b-form @submit="addUser">
      <b-form-group label-for="input-username" label="Username">
        <b-form-input
          ref="input-username"
          id="input-username"
          @update="resetFormSubmission"
          v-model="$v.form.username.$model"
          :state="usernameState"
          aria-describedby="username-live-help username-live-feedback"
          type="text"
          autofocus
          class="input"
        ></b-form-input>
        <b-form-invalid-feedback id="username-live-feedback">
          This username couldn't be found.
        </b-form-invalid-feedback>

        <b-form-text id="username-live-help"
          >Users can view recordings for this device.</b-form-text
        >
      </b-form-group>
    </b-form>
  </b-modal>
</template>

<script>
import { required } from "vuelidate/lib/validators";
import api from "@api";

const initialFormState = {
  username: null,
  isAdmin: false,
};

export default {
  name: "DeviceAddUser",
  props: {
    device: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      form: { ...initialFormState },
      formSubmissionFailed: false,
    };
  },
  computed: {
    usernameIsEmpty() {
      return (
        this.$v.form.username.$model === null ||
        this.$v.form.username.$model === ""
      );
    },
    usernameState() {
      if (this.usernameIsEmpty) {
        return null;
      }
      if (this.formSubmissionFailed) {
        return false;
      }
      return !this.$v.form.username.$error;
    },
    isDisabled() {
      return this.usernameIsEmpty;
    },
  },
  validations: {
    form: {
      username: {
        required,
      },
      isAdmin: {},
    },
  },
  methods: {
    resetFormSubmission() {
      this.formSubmissionFailed = false;
    },
    addUser: async function (event) {
      event.preventDefault();
      if (!this.$v.$invalid) {
        const { success } = await api.device.addUserToDevice(
          this.$v.form.username.$model,
          this.device.id,
          this.$v.form.isAdmin.$model
        );
        if (!success) {
          this.formSubmissionFailed = true;
        } else {
          this.$refs["add-user-dialog"].hide();
          this.$emit("user-added");
        }
      }
    },
    setFocusAndReset() {
      this.form = { ...initialFormState };
      this.$refs["input-username"].focus();
    },
  },
};
</script>
