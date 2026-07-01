import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SALE_STATES,
  bjchSaleState,
  chncpaSaleState,
  shchSaleState,
  shsoSaleState,
} from "./sale-state.mjs";

test("SALE_STATES enum contents", () => {
  assert.deepEqual(
    [...SALE_STATES].sort(),
    ["cancelled", "ended", "on_sale", "pre_sale", "sold_out", "unknown"],
  );
});

test("bjch maps eventSaleState 1/2/3 and falls back to project", () => {
  assert.equal(bjchSaleState({}, { eventSaleState: 2 }), "on_sale");
  assert.equal(bjchSaleState({}, { eventSaleState: 1 }), "pre_sale");
  assert.equal(bjchSaleState({}, { eventSaleState: 3 }), "sold_out");
  assert.equal(bjchSaleState({ projectSaleState: 2 }, {}), "on_sale");
  assert.equal(bjchSaleState({}, {}), "unknown");
});

test("shso maps saleType and 演出取消 marker", () => {
  assert.equal(shsoSaleState({ saleType: "售票中" }), "on_sale");
  assert.equal(shsoSaleState({ fullCnName: "周末专场:演出取消" }), "cancelled");
  assert.equal(shsoSaleState({}), "unknown");
  assert.equal(shsoSaleState({ saleType: "未知值" }), "unknown");
});

test("shch maps event then project status", () => {
  assert.equal(shchSaleState(2, undefined), "on_sale");
  assert.equal(shchSaleState(1, undefined), "pre_sale");
  assert.equal(shchSaleState(3, undefined), "sold_out");
  assert.equal(shchSaleState(undefined, 2), "on_sale");
  assert.equal(shchSaleState(undefined, undefined), "unknown");
});

test("chncpa keyword mapping in fall-through order", () => {
  assert.equal(chncpaSaleState("售票中"), "on_sale");
  assert.equal(chncpaSaleState("已开票"), "on_sale");
  assert.equal(chncpaSaleState("预售中"), "pre_sale");
  assert.equal(chncpaSaleState("即将开售"), "pre_sale");
  assert.equal(chncpaSaleState("已售罄"), "sold_out");
  assert.equal(chncpaSaleState("无票"), "sold_out");
  assert.equal(chncpaSaleState("演出取消"), "cancelled");
  assert.equal(chncpaSaleState("演出结束"), "ended");
  assert.equal(chncpaSaleState("某种新状态"), "unknown");
  assert.equal(chncpaSaleState(null), "unknown");
  assert.equal(chncpaSaleState(undefined), "unknown");
  assert.equal(chncpaSaleState(""), "unknown");
});
