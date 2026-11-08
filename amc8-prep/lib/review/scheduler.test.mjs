import test from "node:test";
import assert from "node:assert/strict";
import { updateReview, todayInMadrid } from "./scheduler.ts";

const wrong = { correct: false, mode: "practice", date: "2026-11-09" };
const correctReview = (date, hintUsed = false) => ({ correct: true, mode: "review", date, hintUsed });

test("wrong answer creates tomorrow's review and preserves the wrong count", () => {
  assert.deepEqual(updateReview(null, wrong), {
    wrong_count: 1, mastery_level: 0, status: "review_pending", next_review_date: "2026-11-10"
  });
});

test("four spaced, unaided review successes use +3, +7, +14 and finally mastered", () => {
  const w = updateReview(null, wrong);
  const one = updateReview(w, correctReview("2026-11-10"));
  assert.deepEqual(one, { wrong_count: 1, mastery_level: 1, status: "review_pending", next_review_date: "2026-11-13" });
  const two = updateReview(one, correctReview("2026-11-13"));
  assert.equal(two.mastery_level, 2);
  assert.equal(two.next_review_date, "2026-11-20");
  const three = updateReview(two, correctReview("2026-11-20"));
  assert.equal(three.mastery_level, 3);
  assert.equal(three.next_review_date, "2026-12-04");
  const four = updateReview(three, correctReview("2026-12-04"));
  assert.equal(four.mastery_level, 4);
  assert.equal(four.status, "mastered");
});

test("answering correctly before review date does not advance mastery", () => {
  const initial = updateReview(null, wrong);
  assert.deepEqual(updateReview(initial, correctReview("2026-11-09")), initial);
  assert.deepEqual(updateReview(initial, { correct: true, mode: "practice", date: "2026-11-10" }), initial);
});

test("hint-assisted review correct resets to tomorrow without claiming mastery", () => {
  const one = updateReview(updateReview(null, wrong), correctReview("2026-11-10"));
  const back = updateReview(one, correctReview("2026-11-13", true));
  assert.equal(back.status, "review_pending");
  assert.equal(back.mastery_level, 0);
  assert.equal(back.next_review_date, "2026-11-14");
  assert.equal(back.wrong_count, 1);
});

test("another wrong answer resets progress and increments the mistake counter", () => {
  const one = updateReview(updateReview(null, wrong), correctReview("2026-11-10"));
  const again = updateReview(one, {correct:false,mode:"review",date:"2026-11-13"});
  assert.equal(again.mastery_level, 0);
  assert.equal(again.wrong_count, 2);
  assert.equal(again.next_review_date, "2026-11-14");
});

test("correct first attempt does not invent a wrong-book entry", () => {
  assert.equal(updateReview(null, correctReview("2026-11-09")), null);
});

test("Madrid calendar day is used even if UTC remains on the previous day", () => {
  assert.equal(todayInMadrid(new Date("2026-11-07T23:30:00Z")), "2026-11-08");
});
