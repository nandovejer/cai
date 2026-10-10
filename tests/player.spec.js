/**
 * CAI — captions and subtitles of the video player, with the browser's own
 * TextTrack API (the logic is unit-tested in tests/player-captions.test.js).
 * The track's mode is the state: the CAI controls set it and mirror it.
 */
import { test, expect } from '@playwright/test';
import { gotoId } from './helpers/docs-site.js';

const modes = (page) =>
  page.locator('.cai-player[data-type="video"] >> nth=0 >> video').evaluate((v) => [...v.textTracks].map((tk) => tk.mode));

test.describe('player: captions and subtitles', () => {
  test('the example: the select lists the tracks, starts on the default one and shows the chosen one', async ({ page }) => {
    await gotoId(page, 'c-player');
    const select = page.locator('.cai-player[data-type="video"] >> nth=0 >> .cai-player-tracks');
    await expect(select).toBeVisible();
    await expect(select).toHaveAccessibleName('Captions');
    await expect(select.locator('option')).toHaveText(['Off', 'English', 'Español']);
    await expect(select.locator('option').nth(2)).toHaveAttribute('lang', 'es');

    // `default` is the browser's: the English track shows, and the select says so
    await expect.poll(() => modes(page)).toEqual(['showing', 'disabled']);
    await expect(select).toHaveValue('0');

    await select.selectOption({ label: 'Español' });
    await expect.poll(() => modes(page)).toEqual(['disabled', 'showing']);
    // The cues of the chosen file load
    await expect
      .poll(() => page.locator('.cai-player[data-type="video"] >> nth=0 >> video').evaluate((v) => v.textTracks[1].cues?.length ?? 0))
      .toBeGreaterThan(0);

    await select.selectOption({ label: 'Off' });
    await expect.poll(() => modes(page)).toEqual(['disabled', 'disabled']);
  });

  test('a mode set outside the CAI controls shows in them', async ({ page }) => {
    await gotoId(page, 'c-player');
    const select = page.locator('.cai-player[data-type="video"] >> nth=0 >> .cai-player-tracks');
    await expect.poll(() => modes(page)).toEqual(['showing', 'disabled']);
    await page.locator('.cai-player[data-type="video"] >> nth=0 >> video').evaluate((v) => {
      v.textTracks[0].mode = 'disabled';
      v.textTracks[1].mode = 'showing';
    });
    await expect(select).toHaveValue('1');
  });

  test('the button: one track, aria-pressed, Enter and the C key on the player', async ({ page }) => {
    await gotoId(page, 'c-player');
    // A player with the button and one track, mounted the way initPlayers() does
    await page.evaluate(async () => {
      const root = document.createElement('div');
      root.className = 'cai-player';
      root.dataset.type = 'video';
      root.id = 'test-player';
      const video = Object.assign(document.createElement('video'), { className: 'cai-player-video', controls: true });
      const track = Object.assign(document.createElement('track'), { kind: 'captions', srclang: 'en', label: 'English', src: '/apps/docs/assets/captions.vtt' });
      video.append(track);
      const controls = Object.assign(document.createElement('div'), { className: 'cai-player-controls' });
      const button = Object.assign(document.createElement('button'), { className: 'cai-player-btn cai-player-captions', type: 'button' });
      button.setAttribute('aria-pressed', 'false');
      controls.append(button);
      root.append(video, controls);
      document.querySelector('main').append(root);
      const { mountPlayer } = await import('/packages/core/src/player.js');
      mountPlayer(root);
    });
    const button = page.locator('#test-player .cai-player-captions');
    const mode = () => page.locator('#test-player video').evaluate((v) => v.textTracks[0].mode);
    await expect(button).toHaveAccessibleName('Captions');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(await mode()).toBe('disabled');

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await mode()).toBe('showing');

    // C on the player itself (not on a control) turns them off again
    await page.locator('#test-player').focus();
    await page.keyboard.press('c');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(await mode()).toBe('disabled');
  });
});

test.describe('player: keyboard', () => {
  test('Tab reaches the controls; an arrow key moves the seek slider one second, and its value text says so', async ({ page }) => {
    await gotoId(page, 'c-player');
    const video = page.locator('.cai-player[data-type="video"]').first();
    const seek = video.locator('.cai-player-progress-row .cai-player-seekbar');
    // The length is known: the slider has one step per second
    await expect(seek).toHaveAttribute('aria-valuetext', /^0:00 of 0:[1-9]\d$/);
    const play = video.locator('.cai-player-playpause');
    await play.focus();
    await page.keyboard.press('Tab');
    await expect(seek).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(seek).toHaveAttribute('aria-valuetext', /^0:02 of /);
    await expect.poll(() => video.locator('video').evaluate((v) => Math.round(v.currentTime))).toBe(2);
    await page.keyboard.press('Tab');
    await expect(video.locator('.cai-player-mute')).toBeFocused();

    // Enter on the play button plays, and its name follows
    await play.focus();
    await page.keyboard.press('Enter');
    await expect(play).toHaveAccessibleName('Pause');
    await page.keyboard.press('Enter');
    await expect(play).toHaveAccessibleName('Play');
  });

  test('M mutes only when the player itself has focus, never with a modifier', async ({ page }) => {
    await gotoId(page, 'c-player');
    const video = page.locator('.cai-player[data-type="video"]').first();
    const muted = () => video.locator('video').evaluate((v) => v.muted);
    await video.locator('.cai-player-playpause').focus();
    await page.keyboard.press('m');
    expect(await muted()).toBe(false);
    await video.focus();
    await page.keyboard.press('Control+m');
    expect(await muted()).toBe(false);
    await page.keyboard.press('m');
    expect(await muted()).toBe(true);
    await expect(video.locator('.cai-player-mute')).toHaveAccessibleName('Unmute');
    await expect(video.locator('.cai-player-volbar')).toHaveValue('0');
  });
});

test('mounting twice binds once: one click on play still plays', async ({ page }) => {
  await gotoId(page, 'c-player');
  await page.evaluate(async () => {
    // The URL the page itself loaded (Vite may add ?t=…): another URL is another module instance
    const url = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\/core\/dist\/player\.js/.test(n)).pop();
    const { initPlayers, mountPlayer } = await import(url);
    initPlayers();
    mountPlayer(document.querySelector('.cai-player[data-type="video"]'));
  });
  const video = page.locator('.cai-player[data-type="video"]').first();
  await video.locator('.cai-player-playpause').click();
  await expect(video.locator('.cai-player-playpause')).toHaveAccessibleName('Pause');
  expect(await video.locator('video').evaluate((v) => v.paused)).toBe(false);
});

test('the second example, NASA footage: its length, its tracks and its credit', async ({ page }) => {
  await gotoId(page, 'c-player');
  const nasa = page.getByRole('group', { name: 'Earth from the space station' });
  await expect(nasa.locator('.cai-player-duration')).toHaveText('0:15');
  await expect(nasa.locator('.cai-player-tracks option')).toHaveText(['Off', 'English', 'Español']);
  await expect.poll(() => nasa.locator('video').evaluate((v) => v.textTracks[0].cues?.length ?? 0)).toBe(3);
  await expect(page.getByRole('link', { name: 'NASA, Earth Views from the ISS' })).toHaveAttribute('href', /images\.nasa\.gov\/details\/NHQ_2020_1221_Earth%20Views$/);
});

test('the audio example, NASA recording: its file and its credit', async ({ page }) => {
  await gotoId(page, 'c-player');
  const audio = page.getByRole('group', { name: 'Apollo 11 countdown player' });
  // preload="none": the length is known only after play, so the file is the check
  await expect(audio.locator('audio source')).toHaveAttribute('src', /nasa-apollo11-countdown\.mp3$/);
  await expect(page.getByRole('link', { name: 'NASA, Apollo 11 launch countdown and lift-off' })).toHaveAttribute('href', /nasa\.gov\/historical-sounds\/$/);
});
