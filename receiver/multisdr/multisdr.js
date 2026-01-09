/*
 * Plugin: MultiSDR Selector
 * OpenWebRX+
 *
 * This plugin still relies on 0xAF's init script.
 * 
 * Features:
 * - Split SDR / Profile selectors
 * - Vertical layout
 * - Profile auto-matching across SDRs
 * - Debounced switching (anti-ban)
 * - Remembers last SDR/profile (per browser)
 * - Live list updates
 * - Filters internal SDR IDs (rtlsdr1 etc)
 */

Plugins.multisdr = {
    no_css: true,
    debounce_ms: 200,

    init: async function () {
        console.log("[multisdr] init");

        const STORAGE_KEY = "multisdr_last";

        let sdrMap = {};
        let sdrList = [];
        let lastProfileKey = null;
        let debounceTimer = null;
        let rebuildTimer = null;

        const getProfileKey = (profileId) => {
            if (!profileId) return null;
            const parts = profileId.split("|");
            return parts.length > 1 ? parts[1] : null;
        };

        const isValidSdrName = (name) => {
            // Reject internal SDR IDs like rtlsdr1, airspy0, etc
            return !/^([a-z]+sdr|airspy|hackrf|rtl)\d+$/i.test(name);
        };

        const debounce = (fn, ms) => {
            return function (...args) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fn.apply(this, args), ms);
            };
        };

        const waitForProfileOptions = async () => {
            let $el = null;
            let tries = 0;
            while (tries < 100) {
                $el = $("#openwebrx-sdr-profiles-listbox");
                if ($el.length && $el.find("option").length > 0) break;
                await new Promise(r => setTimeout(r, 50));
                tries++;
            }
            return $el;
        };

        const $orig = await waitForProfileOptions();
        if (!$orig || !$orig.length) {
            console.warn("[multisdr] profile list not found");
            return;
        }

        console.log("[multisdr] profile select found");

        // Hide original selector
        $orig.hide();

        // Build UI
        const $container = $(`
            <div id="multisdr-container"
                 class="openwebrx-panel-flex-column"
                 style="display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; align-items:center; gap:4px;">
                    <label style="font-size:12px;">SDR:</label>
                    <select id="multisdr-sdr-select" style="flex:1;"></select>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <label style="font-size:12px;">Profile:</label>
                    <select id="multisdr-profile-select" style="flex:1;"></select>
                </div>
            </div>
        `);

        $orig.before($container);

        const $sdrSelect = $("#multisdr-sdr-select");
        const $profileSelect = $("#multisdr-profile-select");

        const rebuildFromOriginal = () => {
            const newMap = {};
            const newSet = new Set();

            $orig.find("option").each(function () {
                const text = $(this).text();
                const val = $(this).val();
                const parts = text.split("|").map(s => s.trim());
                if (parts.length < 2) return;

                const sdr = parts[0];
                const profile = parts[1];

                if (!isValidSdrName(sdr)) return;

                if (!newMap[sdr]) newMap[sdr] = [];
                newMap[sdr].push({ profile_id: val, name: profile });
                newSet.add(sdr);
            });

            if (!newSet.size) return;

            sdrMap = newMap;

            sdrList = Array.from(newSet).sort((a, b) => {
                const ai = parseInt(a.match(/\d+$/)?.[0] || "0", 10);
                const bi = parseInt(b.match(/\d+$/)?.[0] || "0", 10);
                return ai - bi;
            });

            populateSDR();
            populateProfiles();
        };

        const populateSDR = () => {
            const prev = $sdrSelect.val();
            $sdrSelect.empty();

            sdrList.forEach(sdr => {
                $sdrSelect.append(
                    $("<option>").val(sdr).text(sdr)
                );
            });

            if (prev && sdrList.includes(prev)) {
                $sdrSelect.val(prev);
            } else {
                $sdrSelect.prop("selectedIndex", 0);
            }
        };

        const populateProfiles = () => {
            const selSDR = $sdrSelect.val();
            $profileSelect.empty();

            if (!sdrMap[selSDR]) return;

            let matchedProfileId = null;

            sdrMap[selSDR].forEach(p => {
                const opt = $("<option>").val(p.profile_id).text(p.name);
                $profileSelect.append(opt);

                if (lastProfileKey && getProfileKey(p.profile_id) === lastProfileKey) {
                    matchedProfileId = p.profile_id;
                }
            });

            if (matchedProfileId) {
                $profileSelect.val(matchedProfileId);
            } else {
                $profileSelect.prop("selectedIndex", 0);
            }

            const selected = $profileSelect.val();
            if (selected) {
                $orig.val(selected).trigger("change");
            }
        };

        // Restore last state
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            if (saved.profile) lastProfileKey = getProfileKey(saved.profile);
        } catch (e) {}

        // Events
        $sdrSelect.on("change", debounce(() => {
            populateProfiles();
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    sdr: $sdrSelect.val(),
                    profile: $profileSelect.val()
                }));
            } catch (e) {}
        }, this.debounce_ms));

        $profileSelect.on("change", debounce(function () {
            const pid = $(this).val();
            if (!pid) return;

            lastProfileKey = getProfileKey(pid);
            $orig.val(pid).trigger("change");

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    sdr: $sdrSelect.val(),
                    profile: pid
                }));
            } catch (e) {}
        }, this.debounce_ms));

        // Initial build
        rebuildFromOriginal();

        // Live updates (debounced)
        const observer = new MutationObserver(() => {
            clearTimeout(rebuildTimer);
            rebuildTimer = setTimeout(rebuildFromOriginal, 150);
        });

        observer.observe($orig[0], { childList: true, subtree: true });

        console.log("[multisdr] init complete");
    }
};
