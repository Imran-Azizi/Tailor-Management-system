import test from "node:test";
import assert from "node:assert/strict";
import {
  collectMeasurementValues,
  applyMeasurementValues,
} from "./measurementCopyPaste.js";

test("collectMeasurementValues copies only measurement field values", () => {
  const setValue = {
    height: "180",
    shoulder: "44",
    design: "Classic",
    additionalStyleInfo: "Note",
  };

  const fields = [
    ["height", "Height"],
    ["shoulder", "Shoulder"],
  ];

  assert.deepEqual(collectMeasurementValues(setValue, fields), {
    height: "180",
    shoulder: "44",
  });
});

test("applyMeasurementValues preserves unrelated fields while updating measurement fields", () => {
  const currentSet = {
    __name: "Set 1",
    design: "Classic",
    additionalStyleInfo: "Keep this",
    height: "160",
  };

  const copiedValues = {
    height: "180",
    shoulder: "44",
  };

  const fields = [
    ["height", "Height"],
    ["shoulder", "Shoulder"],
  ];

  assert.deepEqual(applyMeasurementValues(currentSet, copiedValues, fields), {
    __name: "Set 1",
    design: "Classic",
    additionalStyleInfo: "Keep this",
    height: "180",
    shoulder: "44",
  });
});
