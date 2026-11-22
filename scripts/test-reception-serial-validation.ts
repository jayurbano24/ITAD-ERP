import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeSerial, serialsEqual } from '../src/lib/reception/normalizeSerial'
import { evaluateSerialScan } from '../src/lib/reception/evaluateSerialScan'

test('normalizeSerial strips spaces and case', () => {
  assert.equal(normalizeSerial(' cjqq1t3 '), 'CJQQ1T3')
  assert.equal(normalizeSerial('CJ-QQ1T3'), 'CJQQ1T3')
})

test('serialsEqual ORD26876 laptop tag', () => {
  assert.ok(serialsEqual('CJQQ1T3', 'cjqq 1t3'))
  assert.ok(!serialsEqual('CJQQ1T3', '7GHR1T3'))
})

test('evaluateSerialScan exact match', () => {
  const r = evaluateSerialScan({
    scannedSerial: 'CJQQ1T3',
    targetExpectedSerial: 'CJQQ1T3',
    isAdditionalSlot: false,
    duplicateInSameTicket: false,
  })
  assert.equal(r.outcome, 'exact_match')
})

test('evaluateSerialScan mismatch', () => {
  const r = evaluateSerialScan({
    scannedSerial: '7GHR1T3',
    targetExpectedSerial: 'CJQQ1T3',
    isAdditionalSlot: false,
    duplicateInSameTicket: false,
  })
  assert.equal(r.outcome, 'mismatch')
  if (r.outcome === 'mismatch') {
    assert.equal(r.expectedSerial, 'CJQQ1T3')
  }
})

test('evaluateSerialScan duplicate', () => {
  const r = evaluateSerialScan({
    scannedSerial: 'CJQQ1T3',
    targetExpectedSerial: 'CJQQ1T3',
    isAdditionalSlot: false,
    duplicateInSameTicket: true,
  })
  assert.equal(r.outcome, 'duplicate')
})