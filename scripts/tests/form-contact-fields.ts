import assert from "node:assert/strict";
import { test } from "node:test";
import { getContactInfoFields, getQuestionAnswerError, hasFormAnswer } from "../../src/lib/form-fields";
import { normalizeQuestionPayload, formatFormAnswerValue } from "../../src/lib/forms";

const question = { type: "CONTACT_INFO", isRequired: true, options: ["firstName", "lastName", "email", "phone"] };
const complete = { firstName: "Six", lastName: "Test", email: "six@example.invalid", phone: "+32 470 12 34 56" };

test("configured contact fields and their order are respected", () => {
  assert.deepEqual(getContactInfoFields(["phone", "email"]).map((field) => field.key), ["phone", "email"]);
  assert.deepEqual(getContactInfoFields([]).map((field) => field.key), question.options);
  assert.deepEqual(getContactInfoFields(["email", "unknown", "email"]).map((field) => field.key), ["email"]);
});

test("saving a contact question retains its selected fields and displays structured answers readably", () => {
  const normalized = normalizeQuestionPayload({ title: "Jouw gegevens", type: "CONTACT_INFO", isRequired: true, options: ["phone", "email"] }, 0);
  assert.deepEqual(normalized.options, ["phone", "email"]);
  assert.equal(normalized.isRequired, true);
  assert.ok(formatFormAnswerValue(complete).includes("Telefoonnummer: +32 470 12 34 56"));
  assert.ok(formatFormAnswerValue(complete).includes("Voornaam: Six"));
});

test("every configured required contact field must be filled, not a single string", () => {
  assert.equal(getQuestionAnswerError(question, complete), null);
  for (const key of question.options) {
    assert.ok(getQuestionAnswerError(question, { ...complete, [key]: "  " }));
  }
  for (const value of [undefined, "a single answer", {}, [], { firstName: "Six" }]) {
    assert.ok(getQuestionAnswerError(question, value));
  }
  assert.ok(getQuestionAnswerError(question, { ...complete, email: "incorrect" })?.includes("e-mailadres"));
});

test("optional contact fields can be blank but a filled email must be valid", () => {
  assert.equal(getQuestionAnswerError({ ...question, isRequired: false }, undefined), null);
  assert.ok(getQuestionAnswerError({ ...question, isRequired: false }, { email: "incorrect" }));
  assert.equal(hasFormAnswer({ firstName: "", email: " " }), false);
  assert.equal(hasFormAnswer({ firstName: "Six" }), true);
});
