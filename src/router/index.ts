import { createRouter, createWebHistory, type RouteRecordRaw, type RouteLocationNormalized, type NavigationGuardNext } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import emitter from '@/services/emitter';

function checkDictionaryContext(to: RouteLocationNormalized): boolean | { name: string } {
    const appStore = useAppStore();
    const dictPath = 'dictionaryPath' in to.params ? to.params.dictionaryPath as string : undefined;

    if (!dictPath) {
        if (to.matched.some(record => record.meta?.requiresDictionaryPathInParams && !record.props && record.name !== 'root' && record.name !== 'notFound' && record.name !== 'dictionaryBrowserBase')) {
             console.warn(`Router Guard (checkDictionaryContext): Route ${String(to.name)} expects dictionaryPath, but it's missing. Redirecting to selection.`);
             emitter.emit('show-notification', { message: "Wörterbuch-Kontext fehlt.", type: 'error', duration: 3000 });
             return { name: 'dictionarySelection' };
        }
        return true;
    }

    if (!appStore.availableDictionaries.some(d => d.path === dictPath)) {
        console.warn(`Router Guard (checkDictionaryContext): Invalid dictionary path "${dictPath}". Redirecting to selection.`);
        emitter.emit('show-notification', { message: `Ungültiges Wörterbuch: ${dictPath}`, type: 'error', duration: 3000 });
        return { name: 'dictionarySelection' };
    }

    if (appStore.selectedDictionaryPath !== dictPath) {
        appStore.selectDictionary(dictPath);
    }
    return true;
}

const routes: Array<RouteRecordRaw> = [
  { path: '/', name: 'root', component: () => import('@/views/WelcomeView.vue') },
  { path: '/welcome', name: 'welcome', component: () => import('@/views/WelcomeView.vue'), meta: { requiresAuth: true } },
  {
    path: '/d/:dictionaryPath',
    name: 'deepLinkToDict',
    meta: { requiresDictionaryPathInParams: true },
    beforeEnter: (to, from, next) => {
        const appStore = useAppStore();
        const dictPath = to.params.dictionaryPath as string;
        
        if (appStore.availableDictionaries.some(d => d.path === dictPath)) {
            appStore.selectDictionary(dictPath);
            next({ name: 'dictionaryBrowser', params: { dictionaryPath: dictPath }, replace: true });
        } else {
            emitter.emit('show-notification', { message: `Wörterbuch '${dictPath}' nicht gefunden.`, type: 'error' });
            next({ name: 'dictionarySelection', replace: true });
        }
    }
  },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { guestOnly: true } },
  { path: '/profile', name: 'profile', component: () => import('@/views/UserProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: () => import('@/views/UserSettingsView.vue'), meta: { requiresAuth: true } },
  { path: '/dictionaries', name: 'dictionarySelection', component: () => import('@/views/DictionarySelectionView.vue') },
  {
    path: '/topics/:dictionaryPath',
    name: 'topicSelection',
    component: () => import('@/views/TopicSelectionView.vue'),
    props: true,
    meta: { requiresDictionaryPathInParams: true },
    beforeEnter: [checkDictionaryContext]
  },
  {
    path: '/detail/:dictionaryPath/:wordId',
    name: 'detail',
    component: () => import('@/views/DetailView.vue'),
    props: true,
    meta: { requiresDictionaryPathInParams: true },
    beforeEnter: [checkDictionaryContext]
  },
  // --- REFACTORED ROUTES ---
  {
    path: '/explore/:dictionaryPath/:topicId', 
    name: 'exploreTopic',                     
    component: () => import('@/views/WordListView.vue'), // Points to new unified view
    props: true,
    meta: { requiresDictionaryPathInParams: true },
    beforeEnter: [checkDictionaryContext]
  },
  {
    path: '/dictionary',
    name: 'dictionaryBrowserBase',
    meta: {},
    beforeEnter: (to, from, next) => {
        const appStoreInst = useAppStore();
        if (to.params.dictionaryPath) {
            next();
            return;
        }
        const lastSelected = appStoreInst.selectedDictionaryPath;
        const isValidLastSelected = lastSelected && appStoreInst.availableDictionaries.some(d => d.path === lastSelected);
        if (isValidLastSelected) {
            next({ name: 'dictionaryBrowser', params: { dictionaryPath: lastSelected! }, replace: true });
        } else if (appStoreInst.availableDictionaries.length > 0) {
            const firstDictPath = appStoreInst.availableDictionaries[0].path;
            next({ name: 'dictionaryBrowser', params: { dictionaryPath: firstDictPath }, replace: true });
        } else {
            next({ name: 'dictionarySelection', replace: true });
        }
    },
    children: [
        { 
            path: ':dictionaryPath', 
            name: 'dictionaryBrowser',           
            component: () => import('@/views/WordListView.vue'), // Points to new unified view
            props: true,
            meta: { requiresDictionaryPathInParams: true },
            beforeEnter: [checkDictionaryContext]
        }
    ]
  },
  // --- END REFACTORED ROUTES ---
  { path: '/about', name: 'about', component: () => import('@/views/AboutView.vue') },
  {
    path: '/srs-review/:dictionaryPath',
    name: 'srsReview',
    component: () => import('@/views/SRSFastReviewView.vue'),
    props: true,
    meta: { requiresAuth: true, requiresDictionaryPathInParams: true },
    beforeEnter: [checkDictionaryContext]
  },
  {
    path: '/search/:searchTerm',
    name: 'externalSearch',
    component: () => import('@/views/ExternalSearchView.vue'),
    props: true,
  },
  {
    path: '/srs-progress/:dictionaryPath/:wordId',
    name: 'srsProgress',
    component: () => import('@/views/SrsProgressView.vue'),
    props: true,
    meta: { requiresAuth: true, requiresDictionaryPathInParams: true },
    beforeEnter: [checkDictionaryContext]
  },
   {
    path: '/summary/:dictionaryPath',
    name: 'learningSummary',
    component: () => import('@/views/LearningSummaryView.vue'),
    props: true,
    meta: { requiresAuth: true, requiresDictionaryPathInParams: true },
    beforeEnter: [checkDictionaryContext]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/WelcomeView.vue'), 
    beforeEnter: (to, from, next) => {
        console.warn(`Router: Path not found - "${to.fullPath}", redirecting to root.`);
        next({ name: 'root', replace: true });
    }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;
    if (to.path !== from.path || !to.hash) return { top: 0, behavior: 'smooth' };
    return { top: 0 }; 
  },
});

router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();

    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
    }

    // --- GATEKEEPER LOGIC ---
    if (!appStore.checkedInitialUserStatus) {
        await appStore.checkUserRegistration();
    }
    if (!appStore.globalIndexLoaded) {
        await appStore.loadGlobalIndex();
    }
    // --- END GATEKEEPER LOGIC ---

    const isUserRegistered = appStore.isUserRegistered;
    const requiresAuth = to.matched.some(r => r.meta.requiresAuth);
    const guestOnly = to.matched.some(r => r.meta.guestOnly);

    if (to.name === 'root') {
        return next(isUserRegistered ? { name: 'welcome', replace: true } : { name: 'register', replace: true });
    }

    if (requiresAuth && !isUserRegistered) {
        return next({ name: 'register', query: { redirect: to.fullPath } });
    }
    
    if (guestOnly && isUserRegistered) {
         return next({ name: 'welcome' });
    }

    next();
});

router.onError((error, to, from) => {
    console.error("Vue Router - Global Error Handler:", error, { to, from });
    if (error.message.includes('Failed to fetch dynamically imported module') || error.message.includes('Unable to preload CSS')) {
        emitter.emit('show-notification', { message: "Fehler beim Laden der Seite. Server nicht erreichbar? Bitte Seite neu laden.", type: 'error', duration: 10000 });
    } else {
        emitter.emit('show-notification', { message: `Navigationsfehler: ${error.message}`, type: 'error', duration: 7000 });
    }
});

export default router;