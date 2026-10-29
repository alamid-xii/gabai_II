# Building narration setup

1. Create an ElevenLabs account and an API key with Text to Speech permission: https://elevenlabs.io/docs/overview/administration/workspaces/api-keys
2. Select an available voice in ElevenLabs and copy its voice ID. Use a voice your account can access.
3. Fill these existing entries in `backend/.env` (never in the frontend or source control):

   ```dotenv
   ELEVENLABS_API_KEY=your_actual_api_key
   ELEVENLABS_VOICE_ID=your_selected_voice_id
   ELEVENLABS_MODEL_ID=eleven_multilingual_v2
   ```

4. Restart the backend. Startup adds missing narration columns to `Buildings` without dropping existing data. The local database has already received these additive columns during implementation.
5. Open Admin → Buildings → Add/Edit Building. Write a custom script (maximum 2,500 characters), then save the building. The editor stays open so you can generate audio.
6. Click Generate audio. This sends the saved script to ElevenLabs and consumes generation credits. Preview the saved audio, then click Publish narration. Generation does not publish automatically.
7. Open the campus virtual tour and select that building. Published narration plays automatically when the browser allows it. Play, pause, native volume/mute, Replay, and a transcript are available. A tour-wide narration mute preference lasts while the tour page is open. Browsers that block automatic playback show a manual-play message.

Students only load an MP3 from this backend; their clicks never call ElevenLabs. Previewing saved audio also does not generate new speech. Editing a script unpublishes its audio until an updated take is generated, previewed, and published. Generating the same saved script/settings reuses its audio unless explicitly requesting a new take. Regenerate audio prompts before consuming more credits. API requests are not automatically retried.

MP3 files live in `backend/public/uploads/voiceovers/`; persist this folder in hosting/backups. Drafts are hidden from public building JSON but their MP3 URLs can be accessed if known, so scripts must contain public school information only. Publishing controls tour visibility, not secrecy of already downloaded audio. Old takes are removed after a successful replacement; failed generation preserves the existing take. A script changed during generation cannot receive mismatched audio.

There is a per-process generation lock and a one-minute per-admin generation cooldown; multi-instance deployments need shared generation coordination. Provider errors are sanitized, and API keys stay on the server. Free plan availability, credits, attribution, and permitted deployment depend on the ElevenLabs account/terms; check https://elevenlabs.io/pricing before publishing.

Verification: `node --test backend/controllers/buildingVoiceoverController.test.js` from the repo root, and `npm run build` from `frontend`. Tests mock the provider and do not spend credits. Live audio generation has not been tested because no ElevenLabs key or voice ID is configured yet.

API reference: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
