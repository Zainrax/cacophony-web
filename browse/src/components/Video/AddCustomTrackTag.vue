<template>
  <b-modal id="custom-track-tag" title="Add track tag" @ok="quickTag">
    <b-form>
      <b-form-group label="Tag:" horizontal>
        <b-form-select v-model="whatTag" :options="whatOptions">
          <template>
            <option :value="null" disabled>Choose a tag..</option>
          </template>
        </b-form-select>
      </b-form-group>

      <b-form-group label="Confidence:" horizontal v-if="allowConfidence">
        <b-form-radio-group v-model="confidence" :options="confidenceOptions" />
      </b-form-group>

      <b-form-group label="Comment:" horizontal v-if="allowComment">
        <b-form-input v-model="comment" />
      </b-form-group>
    </b-form>
  </b-modal>
</template>
<script lang="ts">
import { ApiTrackTagRequest } from "@typedefs/api/trackTag";
import DefaultLabels from "../../const";

export default {
  name: "AddCustomTrackTag",
  props: {
    allowConfidence: {
      type: Boolean,
      default: true,
    },
    allowComment: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      whatTag: "cat",
      confidence: 0.8,
      confidenceOptions: [
        { value: 0.4, text: "low" },
        { value: 0.6, text: "mid" },
        { value: 0.8, text: "high" },
      ],
      comment: "",
    };
  },
  computed: {
    whatOptions(): { value: string; text: string }[] {
      const options = new Map();
      for (const option of DefaultLabels.trackLabels()) {
        options.set(option.text, { value: option.value, text: option.text });
      }
      return Array.from(options.values()).sort((a, b) =>
        a.text.localeCompare(b.text)
      );
    },
  },
  methods: {
    quickTag() {
      const tag: ApiTrackTagRequest = {
        confidence: this.confidence,
        what: this.whatTag,
      };
      this.$emit("addTag", tag);
    },
  },
};
</script>
