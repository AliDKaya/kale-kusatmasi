import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',globalTeardown:'./tests/cleanup.ts',workers:1,timeout:90000,retries:0,reporter:[['list'],['json',{outputFile:'test-results/results.json'}]],use:{baseURL:process.env.TEST_BASE_URL??'http://localhost:3000',headless:true,channel:'msedge',screenshot:'only-on-failure',trace:'off'}});
