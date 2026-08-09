<template>
    <div class="p-3 border dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-800/60 shadow-sm dark:shadow-none space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 min-h-[40px]">
        <div class="flex items-center gap-2">
          <!-- Record/Stop Button -->
          <button
            @click="toggleRecording"
            :disabled="permissionStatus === 'denied' || (!mediaStream && permissionStatus !== 'granted')"
            :class="[
              isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600',
              'px-4 py-1.5 text-white text-xs font-semibold rounded shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
            ]"
          >
            <StopIcon v-if="isRecording" class="h-4 w-4 mr-1.5" />
            <MicrophoneIcon v-else class="h-4 w-4 mr-1.5" />
            {{ isRecording ? $t('audioRecorder.stop') : $t('audioRecorder.record') }}
          </button>

          <!-- Play Button -->
          <button
            @click="playRecording"
            :disabled="!playbackUrl || isRecording"
            class="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded shadow transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="$t('audioRecorder.play')"
          >
             <PlayCircleIcon class="h-4 w-4" />
          </button>

           <!-- Clear Button (Clears internal state) -->
          <button
              @click="clearRecordingInternal"
              :disabled="!playbackUrl || isRecording"
              class="px-3 py-1.5 bg-gray-400 text-white text-xs font-semibold rounded shadow hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :title="$t('audioRecorder.clear')"
          >
             <TrashIcon class="h-4 w-4" />
          </button>
        </div>

        <!-- Status Indicator -->
         <div v-if="isRecording" class="flex items-center gap-2">
            <div class="w-16 h-2 bg-gray-300 dark:bg-slate-600 rounded overflow-hidden">
                <div class="h-full bg-green-500 rounded transition-all duration-75" :style="{ width: `${volumeLevel}%` }"></div>
            </div>
            <span class="text-red-500 text-xs font-medium flex items-center">
                <span class="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span> {{ $t('audioRecorder.recording') }}
            </span>
         </div>
         <span v-else-if="playbackUrl" class="text-green-600 dark:text-green-400 text-xs font-medium">{{ $t('audioRecorder.available') }}</span>
         <span v-else-if="permissionStatus === 'prompt'" class="text-yellow-600 dark:text-yellow-400 text-xs italic">{{ $t('audioRecorder.permissionNeeded') }}</span>
         <span v-else-if="permissionStatus === 'denied'" class="text-red-600 dark:text-red-400 text-xs italic">{{ $t('audioRecorder.permissionDenied') }}</span>
         <span v-else class="text-gray-500 dark:text-slate-400 text-xs italic">{{ $t('audioRecorder.ready') }}</span>

      </div>

       <!-- Permission Request Button -->
      <div v-if="permissionStatus === 'prompt' || permissionStatus === null">
        <button @click="requestPermission" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">{{ $t('audioRecorder.requestAccess') }}</button>
      </div>

      <!-- Error Message -->
      <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>

       <!-- Playback Element (Hidden) -->
      <audio ref="audioPlayer" :src="playbackUrl || undefined" class="hidden"></audio>

       <!-- Initial Audio loading state -->
       <div v-if="isLoadingInitialAudio" class="text-xs text-gray-500 dark:text-slate-400 italic text-center">{{ $t('audioRecorder.loadingAudio') }}</div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, useTemplateRef } from 'vue';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MicrophoneIcon, StopIcon, PlayCircleIcon, TrashIcon } from '@heroicons/vue/20/solid';
import type { AudioRecorderInstance } from '@/types';
import emitter from '@/services/emitter';

const { lang = 'user', initialAudioDataUrl = null } = defineProps<{
  lang?: string;
  initialAudioDataUrl?: string | null;
}>();

const { t } = useI18n();
const isRecording = ref(false);
const playbackUrl = ref<string | null>(null);
const mediaRecorder = ref<MediaRecorder | null>(null);
const mediaStream = ref<MediaStream | null>(null);
const audioChunks = ref<Blob[]>([]);
const error = ref<string | null>(null);
const permissionStatus = ref<PermissionState | null>(null);
const audioPlayer = useTemplateRef('audioPlayer');
const recordedBlob = ref<Blob | null>(null);
const isLoadingInitialAudio = ref(false);
const recordingStartTime = ref(0);
const MIN_RECORDING_DURATION_MS = 400;

// --- MODIFICATION: State for Volume Meter ---
const volumeLevel = ref(0);
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let volumeAnimationRequest: number | null = null;


async function checkInitialPermission() { if (!navigator.mediaDevices || !navigator.permissions) { error.value = "Media devices or Permissions API not supported."; permissionStatus.value = 'denied'; return; } try { const r = await navigator.permissions.query({ name: 'microphone' as PermissionName }); permissionStatus.value = r.state; r.onchange = () => { permissionStatus.value = r.state; }; if (r.state === 'granted') { await setupMediaStream(); } } catch (err: any) { console.error(`AudioRecorder [${lang}]: Error checking microphone permission:`, err); error.value = `Permission check failed: ${err.message}`; permissionStatus.value = 'denied'; } }
async function requestPermission() { error.value = null; if (!navigator.mediaDevices) { error.value = "Media devices API not supported."; permissionStatus.value = 'denied'; return; } try { await setupMediaStream(); permissionStatus.value = 'granted'; } catch (err: any) { console.error(`AudioRecorder [${lang}]: Error requesting microphone access:`, err); if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') { error.value = "Microphone access denied by user."; permissionStatus.value = 'denied'; } else if (err.name === 'NotFoundError') { error.value = "No microphone found."; permissionStatus.value = 'denied'; } else { error.value = `Could not get microphone access: ${err.message}`; permissionStatus.value = 'denied'; } } }
async function setupMediaStream() { if (!navigator.mediaDevices) return; if (mediaStream.value) return; console.log(`AudioRecorder [${lang}]: Setting up media stream...`); mediaStream.value = await navigator.mediaDevices.getUserMedia({ audio: true }); console.log(`AudioRecorder [${lang}]: Media stream acquired.`); }

// --- MODIFICATION: Function to start volume analysis ---
function startVolumeAnalysis() {
    if (!mediaStream.value) return;
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    sourceNode = audioContext.createMediaStreamSource(mediaStream.value);
    sourceNode.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const drawVolume = () => {
        analyser?.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        volumeLevel.value = Math.min(100, Math.floor((average / 128) * 100 * 2.5)); // Scale it for visibility
        volumeAnimationRequest = requestAnimationFrame(drawVolume);
    };
    drawVolume();
}

// --- MODIFICATION: Function to stop volume analysis ---
function stopVolumeAnalysis() {
    if (volumeAnimationRequest) {
        cancelAnimationFrame(volumeAnimationRequest);
        volumeAnimationRequest = null;
    }
    sourceNode?.disconnect();
    analyser?.disconnect();
    audioContext?.close();
    volumeLevel.value = 0;
}

async function startRecording() {
    if (!mediaStream.value || mediaStream.value.getAudioTracks().every(t => t.readyState === 'ended')) {
        console.log(`AudioRecorder [${lang}]: No active stream, requesting permission/setup...`);
        try { await requestPermission(); if (!mediaStream.value) { error.value = "Failed to acquire microphone stream."; return; } } catch (err) { return; }
    }
    if (permissionStatus.value !== 'granted') {
        error.value = "Microphone access not granted.";
        emitter.emit('show-notification', { message: error.value, type: 'error' });
        return;
    }
    error.value = null;
    clearPlayback();
    try {
        const o = getSupportedMimeTypeOptions();
        mediaRecorder.value = new MediaRecorder(mediaStream.value, o);
        console.log(`AudioRecorder [${lang}]: Using mimeType: ${mediaRecorder.value.mimeType}`);
        audioChunks.value = [];
        mediaRecorder.value.ondataavailable = (e) => {
            if (e.data.size > 0) { audioChunks.value.push(e.data); }
        };
        mediaRecorder.value.onstop = () => {
            console.log(`AudioRecorder [${lang}]: Recording stopped.`);
            if (audioChunks.value.length === 0) {
                console.warn(`AudioRecorder [${lang}]: No data recorded.`);
                recordedBlob.value = null;
            } else {
                const recorderMimeType = mediaRecorder.value?.mimeType;
                const finalMimeType = (recorderMimeType && recorderMimeType.startsWith('audio/')) ? recorderMimeType : 'audio/webm';
                console.log(`AudioRecorder [${lang}]: Creating blob with final MIME type: ${finalMimeType}`);
                const b = new Blob(audioChunks.value, { type: finalMimeType });
                recordedBlob.value = b;
                playbackUrl.value = URL.createObjectURL(b);
                console.log(`AudioRecorder [${lang}]: Playback URL created: ${playbackUrl.value}`);
            }
            isRecording.value = false;
        };
        mediaRecorder.value.onerror = (e: Event) => {
            console.error(`AudioRecorder [${lang}]: MediaRecorder error:`, (e as any).error || e);
            error.value = `Recording error: ${(e as any).error?.message || 'Unknown recording error'}`;
            isRecording.value = false;
            clearPlayback();
        };
        mediaRecorder.value.start();
        isRecording.value = true;
        recordingStartTime.value = Date.now();
        startVolumeAnalysis(); // --- MODIFICATION: Start the VU meter ---
        console.log(`AudioRecorder [${lang}]: Recording started.`);
    } catch (err: any) {
        console.error(`AudioRecorder [${lang}]: Error starting MediaRecorder:`, err);
        error.value = `Failed to start recording: ${err.message}`;
        isRecording.value = false;
        clearPlayback();
        if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
            try { mediaRecorder.value.stop(); } catch(e){}
        }
        mediaRecorder.value = null;
    }
}
function stopRecording() {
    stopVolumeAnalysis(); // --- MODIFICATION: Stop the VU meter ---
    if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
        mediaRecorder.value.stop();
    } else if (isRecording.value) {
        console.warn(`AudioRecorder [${lang}]: Inconsistent recording state during stop.`);
        isRecording.value = false;
    }
}
function toggleRecording() {
    if (isRecording.value) {
        const duration = Date.now() - recordingStartTime.value;
        if (duration < MIN_RECORDING_DURATION_MS) {
            emitter.emit('show-notification', { message: t('audioRecorder.tooShort'), type: 'error', duration: 2000 });
            stopVolumeAnalysis(); // --- MODIFICATION: Ensure VU meter stops on aborted recording ---
            if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
                mediaRecorder.value.ondataavailable = null;
                mediaRecorder.value.onstop = null;
                mediaRecorder.value.stop();
            }
            isRecording.value = false;
            audioChunks.value = [];
            return;
        }
        stopRecording();
    } else {
        if (permissionStatus.value === 'granted') {
            startRecording();
        } else {
            requestPermission().then(() => {
                if (permissionStatus.value === 'granted' && mediaStream.value) {
                    startRecording();
                } else if (permissionStatus.value !== 'denied') {
                    error.value = "Could not start recording. Check microphone permissions and availability.";
                }
            });
        }
    }
}

function playRecording() { if (audioPlayer.value && playbackUrl.value) { console.log(`AudioRecorder [${lang}]: Playing ${playbackUrl.value}`); audioPlayer.value.play().catch(err => { console.error(`AudioRecorder [${lang}]: Error playing audio:`, err); error.value = `Playback failed: ${err.message}`; }); } else { console.warn(`AudioRecorder [${lang}]: Playback called but no playbackUrl or audioPlayer.`); } }
function clearPlayback() { if (playbackUrl.value && playbackUrl.value.startsWith('blob:')) { URL.revokeObjectURL(playbackUrl.value); console.log(`AudioRecorder [${lang}]: Revoked Blob URL: ${playbackUrl.value}`); } playbackUrl.value = null; recordedBlob.value = null; audioChunks.value = []; if (audioPlayer.value) { audioPlayer.value.pause(); audioPlayer.value.removeAttribute('src'); audioPlayer.value.load(); } }
function clearRecordingInternal() { if (isRecording.value) { stopRecording(); } clearPlayback(); error.value = null; console.log(`AudioRecorder [${lang}]: Internal state cleared by button.`); }

function getAudioDataUrl(): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const blobToConvert = recordedBlob.value;
        if (!blobToConvert) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (err) => {
            console.error(`AudioRecorder [${lang}]: FileReader error converting blob:`, err);
            reject(new Error("Failed to convert audio blob to Data URL"));
        };
        reader.readAsDataURL(blobToConvert);
    });
}

function getSupportedMimeTypeOptions(): MediaRecorderOptions { const m = [ 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', ]; for (const t of m) { if (MediaRecorder.isTypeSupported(t)) { return { mimeType: t }; } } console.warn(`AudioRecorder [${lang}]: No preferred mimeType supported, using default.`); return {}; }

onMounted(async () => {
    await checkInitialPermission();
    if (initialAudioDataUrl) {
        loadInitialDataUrl(initialAudioDataUrl);
    }
});
onUnmounted(() => { if (isRecording.value) { stopRecording(); } stopVolumeAnalysis(); mediaStream.value?.getTracks().forEach(track => track.stop()); mediaStream.value = null; clearPlayback(); console.log(`AudioRecorder [${lang}]: Unmounted, stream tracks stopped, playback cleared.`); });
function loadInitialDataUrl(dataUrl: string | null) {
    clearPlayback();
    if (dataUrl) {
        console.log(`AudioRecorder [${lang}]: Loading initial/updated audio data URL.`);
        isLoadingInitialAudio.value = true;
        playbackUrl.value = dataUrl;
        isLoadingInitialAudio.value = false;
    } else {
        console.log(`AudioRecorder [${lang}]: Initial audio URL is null, clearing display.`);
    }
}
watch(() => initialAudioDataUrl, (newUrl, oldUrl) => {
    if (newUrl !== oldUrl && !isRecording.value) {
        loadInitialDataUrl(newUrl);
    }
});

defineExpose<AudioRecorderInstance>({
    getAudioDataUrl,
    clearRecording: clearRecordingInternal
});
</script>

<style scoped>
button { min-width: 36px; }
@keyframes pulse {
  50% {
    opacity: .5;
  }
}
.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>