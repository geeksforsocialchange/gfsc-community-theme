(function () {
    'use strict';

    var container = document.getElementById('placecal-events');
    if (!container) {
        return;
    }

    var partnerId = container.getAttribute('data-placecal-partner-id');
    var futureDays = parseInt(container.getAttribute('data-placecal-future-days'), 10) || 90;
    var endpoint = container.getAttribute('data-placecal-endpoint');

    var loadingEl = container.querySelector('.gh-events-loading');
    var errorEl = container.querySelector('.gh-events-error');
    var emptyEl = container.querySelector('.gh-events-empty');
    var listEl = container.querySelector('.gh-events-list');

    function escapeHTML(str) {
        if (!str) {
            return '';
        }
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // Convert description text into HTML paragraphs.
    // Strips markdown artefacts from PlaceCal descriptions, escapes HTML,
    // then splits on double newlines into <p> tags.
    function formatDescription(str) {
        if (!str) {
            return '';
        }
        // Strip everything from a --- line onwards (link refs, metadata)
        var cleaned = str.replace(/\n\s*---[\s\S]*$/, '');
        // Unescape markdown characters (\*, \', \_)
        cleaned = cleaned.replace(/\\([*'_])/g, '$1');
        // Remove reference-style link definitions [n]: url
        cleaned = cleaned.replace(/^\s*\[\d+\]:.*$/gm, '');
        // Convert reference-style links [text][n] to just text
        cleaned = cleaned.replace(/\[([^\]]+)\]\[\d+\]/g, '$1');
        // Convert inline links [text](url) to just text
        cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        // Strip lines that are just a URL
        cleaned = cleaned.replace(/^\s*https?:\/\/\S+\s*$/gm, '');
        // Convert markdown bullet points (* item) to plain text with bullet
        cleaned = cleaned.replace(/^\s*\*\s+/gm, '\u2022 ');
        var escaped = escapeHTML(cleaned);
        // Split on markdown-style breaks (double space + newline combos or double newlines)
        var paragraphs = escaped.split(/\s*\n\s*\n\s*/);
        var filtered = paragraphs.filter(function (p) {
            var trimmed = p.replace(/\s+/g, ' ').trim();
            return trimmed.length > 0;
        });
        return filtered.map(function (p) {
            return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
        }).join('');
    }

    function padTwo(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function formatTime(dateStr) {
        var d = new Date(dateStr);
        return padTwo(d.getHours()) + ':' + padTwo(d.getMinutes());
    }

    function getTimezoneAbbr(dateStr) {
        try {
            var parts = new Date(dateStr).toLocaleTimeString('en-GB', { timeZoneName: 'short' }).split(' ');
            return parts[parts.length - 1] || '';
        } catch (e) {
            return '';
        }
    }

    function formatTimeRange(startStr, endStr) {
        var range = formatTime(startStr);
        if (endStr) {
            range += ' \u2013 ' + formatTime(endStr);
        }
        var tz = getTimezoneAbbr(startStr);
        if (tz) {
            range += ' ' + tz;
        }
        return range;
    }

    function formatShortDate(dateStr) {
        var d = new Date(dateStr);
        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
    }

    function formatAddress(address) {
        if (!address) {
            return '';
        }
        var parts = [address.streetAddress, address.addressLocality, address.postalCode];
        return parts.filter(Boolean).join(', ');
    }

    function showState(state) {
        loadingEl.hidden = state !== 'loading';
        errorEl.hidden = state !== 'error';
        emptyEl.hidden = state !== 'empty';
        listEl.hidden = state !== 'events';
    }

    // Collapse recurring events to show only the next occurrence.
    // Uses repeatFrequency from the API when available, falls back to
    // interval detection for events without recurrence data.
    // Groups by name only when repeatFrequency is set (avoids DST
    // time shifts splitting the same series into multiple groups).
    function collapseRecurring(events) {
        var series = {};
        var seriesOrder = [];

        events.forEach(function (event) {
            var key = event.repeatFrequency
                ? event.name
                : event.name + '||' + formatTime(event.startDate);
            if (!series[key]) {
                series[key] = [];
                seriesOrder.push(key);
            }
            series[key].push(event);
        });

        var result = [];
        seriesOrder.forEach(function (key) {
            var group = series[key];
            var next = group[0]; // already sorted, first is soonest

            if (next.repeatFrequency) {
                // API provides recurrence info - show only the next occurrence
                next = Object.create(next);
                next.recurrence = next.repeatFrequency.toLowerCase();
                result.push(next);
            } else if (group.length > 1) {
                // No API recurrence info but multiple instances - detect from intervals
                var intervals = [];
                for (var i = 1; i < group.length; i++) {
                    var diff = (new Date(group[i].startDate) - new Date(group[i - 1].startDate));
                    intervals.push(Math.round(diff / (24 * 60 * 60 * 1000)));
                }
                var recurrence = detectRecurrence(intervals);
                if (recurrence) {
                    next = Object.create(next);
                    next.recurrence = recurrence;
                }
                result.push(next);
            } else {
                result.push(next);
            }
        });

        // Re-sort by start date since collapsing changes order
        result.sort(function (a, b) {
            return new Date(a.startDate) - new Date(b.startDate);
        });

        return result;
    }

    function detectRecurrence(intervals) {
        if (intervals.length === 0) {
            return null;
        }
        var counts = {};
        intervals.forEach(function (d) {
            counts[d] = (counts[d] || 0) + 1;
        });
        var modeDays = Number(Object.keys(counts).sort(function (a, b) {
            return counts[b] - counts[a];
        })[0]);

        if (modeDays >= 1 && modeDays <= 2) {
            return 'daily';
        }
        if (modeDays >= 6 && modeDays <= 8) {
            return 'weekly';
        }
        if (modeDays >= 13 && modeDays <= 15) {
            return 'fortnightly';
        }
        if (modeDays >= 27 && modeDays <= 32) {
            return 'monthly';
        }
        return null;
    }

    function recurrenceLabel(recurrence) {
        return recurrence ? 'Repeats ' + recurrence : '';
    }

    function buildEventSchema(events) {
        return events.map(function (event) {
            var url = event.publisherUrl || ('https://manchester.placecal.org/events/' + event.id);
            var hasAddress = event.address && (event.address.streetAddress || event.address.postalCode);
            var hasOnline = !!event.onlineEventUrl;

            var schema = {
                '@type': 'Event',
                'name': event.name,
                'startDate': event.startDate,
                'eventStatus': 'https://schema.org/EventScheduled',
                'image': 'https://gfsc.community/content/images/2025/02/GFSC_Community_Logo_Orange_RGB.png',
                'organizer': {
                    '@type': 'Organization',
                    'name': 'Geeks for Social Change',
                    'url': 'https://gfsc.community/'
                },
                'offers': {
                    '@type': 'Offer',
                    'price': '0',
                    'priceCurrency': 'GBP',
                    'availability': 'https://schema.org/InStock',
                    'url': url
                },
                'url': url
            };

            if (event.endDate) {
                schema.endDate = event.endDate;
            }

            if (event.summary) {
                schema.description = event.summary;
            }

            if (hasAddress && hasOnline) {
                schema.eventAttendanceMode = 'https://schema.org/MixedEventAttendanceMode';
                schema.location = [
                    {
                        '@type': 'Place',
                        'address': {
                            '@type': 'PostalAddress',
                            'streetAddress': event.address.streetAddress || '',
                            'addressLocality': event.address.addressLocality || '',
                            'postalCode': event.address.postalCode || ''
                        }
                    },
                    {
                        '@type': 'VirtualLocation',
                        'url': event.onlineEventUrl
                    }
                ];
            } else if (hasOnline) {
                schema.eventAttendanceMode = 'https://schema.org/OnlineEventAttendanceMode';
                schema.location = {
                    '@type': 'VirtualLocation',
                    'url': event.onlineEventUrl
                };
            } else if (hasAddress) {
                schema.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode';
                schema.location = {
                    '@type': 'Place',
                    'address': {
                        '@type': 'PostalAddress',
                        'streetAddress': event.address.streetAddress || '',
                        'addressLocality': event.address.addressLocality || '',
                        'postalCode': event.address.postalCode || ''
                    }
                };
            }

            return schema;
        });
    }

    function injectEventSchema(events) {
        var existing = container.querySelector('script[type="application/ld+json"]');
        if (existing) {
            existing.remove();
        }

        var schemas = buildEventSchema(events);
        if (!schemas.length) {
            return;
        }

        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': schemas
        });
        container.appendChild(script);
    }

    function renderEvents(events) {
        var collapsed = collapseRecurring(events);
        var html = '<ul class="events__list">';

        collapsed.forEach(function (event) {
            var date = formatShortDate(event.startDate);
            var time = formatTimeRange(event.startDate, event.endDate);
            var location = formatAddress(event.address);
            var url = event.publisherUrl || ('https://manchester.placecal.org/events/' + event.id);
            var datetime = new Date(event.startDate).toISOString();

            html += '<li class="event"><article class="event__inner">';
            html += '<h2 class="event__title"><a href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(event.name) + '</a></h2>';
            var timeStr = escapeHTML(date) + ', ' + escapeHTML(time);
            if (event.recurrence) {
                timeStr += ' | ' + recurrenceLabel(event.recurrence);
            }
            html += '<p class="event__time"><time datetime="' + datetime + '">' + timeStr + '</time></p>';
            if (event.description) {
                html += '<div class="event__description">' + formatDescription(event.description) + '</div>';
            }
            if (event.onlineEventUrl) {
                var linkLabel = 'Join online';
                if (event.onlineEventUrl.indexOf('meet.google.com') !== -1) {
                    linkLabel = 'Join on Google Meet';
                } else if (event.onlineEventUrl.indexOf('discord.com') !== -1) {
                    linkLabel = 'Join on Discord';
                } else if (event.onlineEventUrl.indexOf('zoom.us') !== -1) {
                    linkLabel = 'Join on Zoom';
                }
                html += '<p class="event__join"><a href="' + escapeHTML(event.onlineEventUrl) + '" target="_blank" rel="noopener noreferrer">' + linkLabel + '</a></p>';
            }
            if (location) {
                html += '<p class="event__location">' + escapeHTML(location) + '</p>';
            }
            html += '</article></li>';
        });

        html += '</ul>';
        html += '<p class="events__credit">Events feed powered by <a href="https://manchester.placecal.org/partners/geeks-for-social-change" target="_blank" rel="noopener noreferrer">PlaceCal</a></p>';
        listEl.innerHTML = html;
        injectEventSchema(collapsed);
        showState('events');
    }

    var CACHE_KEY = 'placecal_events_v3_' + (partnerId || 'all');
    var CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    function processEvents(events) {
        if (!events || !events.length) {
            showState('empty');
            return;
        }

        // Trim to futureDays window
        var cutoff = new Date(new Date().getTime() + futureDays * 24 * 60 * 60 * 1000);
        var filtered = events.filter(function (event) {
            return new Date(event.startDate) <= cutoff;
        });

        // Sort by start date ascending
        filtered.sort(function (a, b) {
            return new Date(a.startDate) - new Date(b.startDate);
        });

        if (!filtered.length) {
            showState('empty');
            return;
        }

        renderEvents(filtered);
    }

    function getCached() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (!raw) { return null; }
            var cached = JSON.parse(raw);
            if (new Date().getTime() - cached.timestamp > CACHE_TTL) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            return cached.events;
        } catch (e) {
            return null;
        }
    }

    function setCache(events) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: new Date().getTime(),
                events: events
            }));
        } catch (e) {
            // Storage full or unavailable, ignore
        }
    }

    function fetchEvents() {
        if (!partnerId) {
            showState('error');
            return;
        }

        var cached = getCached();
        if (cached) {
            processEvents(cached);
            return;
        }

        var query = '{ partner(id: ' + partnerId + ') { events { ' +
            'id name summary description startDate endDate repeatFrequency publisherUrl ' +
            'onlineEventUrl onlineEventUrlType ' +
            'address { streetAddress postalCode addressLocality } ' +
            '} } }';

        var url = endpoint + '?query=' + encodeURIComponent(query);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (xhr.status !== 200) {
                showState('error');
                return;
            }

            try {
                var response = JSON.parse(xhr.responseText);
                var events = response.data && response.data.partner && response.data.partner.events;
                setCache(events);
                processEvents(events);
            } catch (e) {
                showState('error');
            }
        };

        xhr.onerror = function () {
            showState('error');
        };

        xhr.send();
    }

    showState('loading');
    fetchEvents();
})();
