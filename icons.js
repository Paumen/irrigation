window.ICONS = {
  'ms:bolt': {
    vb: [0, -960, 960, 960],
    d: 'm393-165 279-335H492l36-286-253 366h154l-36 255Zm-33-195H217q-18 0-26.5-16t2.5-31l338-488q8-11 20-15t24 1q12 5 19 16t5 24l-39 309h176q19 0 27 17t-4 32L388-66q-8 10-20.5 13T344-55q-11-5-17.5-16T322-95l38-265Zm113-115Z',
  },
  'ms:wifi': {
    vb: [0, -960, 960, 960],
    d: 'M417-154q-27-27-27-63t27-63q27-27 63-27t63 27q27 27 27 63t-27 63q-27 27-63 27t-63-27Zm209-378.5Q694-505 757-451q14 12 15 30.5T759-388q-14 14-32 13t-33-13q-53-44-106.5-63T480-470q-54 0-107.5 19T266-388q-15 12-33 13t-32-13q-14-14-13-32.5t15-30.5q63-54 131-81.5T480-560q78 0 146 27.5Zm95.5-219Q835-703 926-622q14 13 15.5 31.5T929-558q-14 14-33.5 13.5T861-558q-83-70-178-111t-203-41q-108 0-203 41T99-558q-15 13-34 13.5T32-558q-14-14-13-32.5T34-622q91-81 204.5-129.5T480-800q128 0 241.5 48.5Z',
  },
  'ms:water-drop': {
    vb: [0, -960, 960, 960],
    d: 'M480-80q-137 0-228.5-94T160-408q0-100 79.5-217.5T480-880q161 137 240.5 254.5T800-408q0 140-91.5 234T480-80Z',
  },
};

window.OPT_ICONS = {
  'scope-all':
    '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><circle cx="18" cy="18" r="2.6"/>',
  'scope-multi':
    '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><circle cx="18" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="6" cy="18" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  'scope-single':
    '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="6" cy="18" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="18" cy="18" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  'scope-one':
    '<circle cx="12" cy="12" r="4.5"/><circle cx="6" cy="6" r="1.4" opacity="0.35"/><circle cx="18" cy="6" r="1.4" opacity="0.35"/><circle cx="6" cy="18" r="1.4" opacity="0.35"/><circle cx="18" cy="18" r="1.4" opacity="0.35"/>',
  'pat-sudden':
    '<polyline points="2,7 11,7 11,17 22,17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  'pat-gradual-all':
    '<polyline points="2,6 14,17 22,17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  'pat-gradual-int':
    '<path d="M2,7 q2,-3 4,0 q2,3 4,0 t4,0 t4,0 t4,0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2,7 L22,17" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>',
  'pat-intermittent':
    '<polyline points="2,7 5,7 5,17 9,17 9,7 13,7 13,17 17,17 17,7 22,7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  'pat-noise':
    '<polyline points="2,12 4,7 7,16 10,8 13,15 16,9 19,14 22,11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  'flow-none':
    '<line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  'flow-weak':
    '<line x1="2" y1="14" x2="22" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  'flow-normal':
    '<line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  'flow-decline':
    '<polyline points="2,7 22,17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  'flow-rise':
    '<polyline points="2,17 22,7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  'flow-fluct':
    '<path d="M2,12 q2,-5 4,0 t4,0 t4,0 t4,0 t4,0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  'flow-late-drop':
    '<polyline points="2,8 14,8 22,17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  'flow-surge':
    '<polyline points="2,12 5,5 8,16 11,7 14,15 17,8 20,14 22,12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
  'flow-leak':
    '<path d="M12,4 C8,10 7,14 7,16 a5,5 0 0 0 10,0 c0,-2 -1,-6 -5,-12 Z" fill="currentColor"/>',
  'flow-geyser':
    '<path d="M12,3 L12,18 M7,8 L12,3 L17,8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><path d="M5,20 L19,20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>',
};
