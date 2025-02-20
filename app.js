import { createApp, ref, reactive, computed } from 'https://unpkg.com/vue@3.5.13/dist/vue.esm-browser.js'

const store = reactive({
  // This is the payload that this widget exists to build, the Clockworth config data
  conf: {
    location: "0N 0E",
    tick: true,
    chime: true,
    events: []
  },
  // Current GUI selection
  selection: {
    path: [],
    event: null
  },
  // Intermediate form of `store.conf.location` used by getters and setters
  coords: {
    lat: 0,
    lon: 0,
    latDir: "N",
    lonDir: "E",
  },
  // Modal state
  modal: {
    show: false,
    title: "",
    confirmFunction: null,
    scroll: -1,
    buttonLabel: "Okay",
    cancelLabel: "Cancel",
    contentKey: null
  },
  // Returns a path object with no 'event' objects inside it
  cleanPath() {
    let cleanedPath = [];
    let index = 0;
    for (let i=0; i < store.selection.path.length; i++) {
      cleanedPath[index] = JSON.parse(JSON.stringify(store.selection.path[i]));
      if (typeof cleanedPath[index].event !== "undefined") {
        delete cleanedPath[index].event;
      }
      index++;
    }
    return cleanedPath;
  },
  // Update GUI selection
  select(e) {
    // get context from clicked DOM element
    let bar = null;
    if (e.target.classList.contains('selectable')) {
      bar = e.target;
    } else {
      bar = e.target.closest('.selectable');
    }
    let path = JSON.parse(bar.dataset.path);
    store.selection.path = path;
    // follow path to specific selected item
    let event = null;
    let list = store.conf.events;
    for (let i=0; i < path.length; i++) {
      for (let j=0; j < list.length; j++) {
        if (j==path[i].index) {
          event = list[j];
          store.selection.path[i].event = event;
          list = event.members;
          break;
        }
      }
    }
    store.selection.event = event;
  },
  // Reset GUI selection
  deselect() {
    store.selection.path = [];
    store.selection.event = null;
  },
  // Show modal
  showModal({
    title,
    buttonLabel = "Okay",
    cancelLabel = "Cancel",
    confirmFunction,
    contentKey
  }) {
    store.modal.show = true;
    store.modal.contentKey = contentKey;
    store.modal.scroll = Math.round(window.scrollY);
    if (typeof title !== "undefined" && title !== null) {
      store.modal.title = title;
    }
    if (typeof confirmFunction !== "undefined" && confirmFunction !== null) {
      store.modal.confirmFunction = confirmFunction;
    }
    store.modal.cancelLabel = cancelLabel;
    store.modal.buttonLabel = buttonLabel;
    document.body.style.position = "fixed";
    document.body.style.width = "100vw";
    document.body.style.top = "-"+store.modal.scroll+"px";
  },
  // Hide modal
  hideModal() {
    store.modal.show = false;
    store.modal.title = "";
    store.modal.confirmFunction = null;
    document.body.style.position = "";
    document.body.style.width = "";
    window.scrollTo(0,store.modal.scroll);
  },
  // Add new chime event
  newEvent() {
    store.showModal({
      title: "New Chime Object",
      contentKey: 'newEvent',
      confirmFunction: () => {
        // collect data from form
        const form = document.getElementById("modal-panel");
        const data = new FormData(form);
        const parentOption = document.querySelector("#newevent_parent").selectedOptions[0];
        const parentPath = JSON.parse(parentOption.dataset.path);
        // descend tree to the selected parent
        let parent = store.conf;
        let prop = "events";
        for (let i=0; i < parentPath.length; i++) {
          parent = parent[prop][parentPath[i].index];
          prop = "members";
          // save this for later
          parentPath[i].event = parent;
        }
        // define new chime object
        const newObject = {
          enable: true,
          label: data.get('newevent_label'),
          type: data.get('newevent_type')
        };
        if (data.get('newevent_type') == 'group') {
          newObject.members = [];
        } else {
          newObject.sequence = 1;
          newObject.match = {
            date: {
              type: 'all'
            },
            time: {
              type: 'specify',
              hour: {
                type: 'all'
              },
              minute: {
                type: 'specify',
                value: 0
              }
            }
          };
          newObject.file = {
            relative_to: 'clockworth',
            path: 'sounds/drafts/westminster_15.wav'
          };
        }
        // insert into parent list
        parent[prop].push(newObject);
        // select new object
        store.selection.path = parentPath.concat({
          index: parent[prop].length-1,
          label: newObject.label,
          event: newObject
        });
        store.selection.event = newObject;
      }
    });
  },
  // Delete selected chime event
  deleteEvent() {
    store.showModal({
      title: "Delete \""+store.selection.event.label+"\"",
      contentKey: 'deleteEvent',
      buttonLabel: 'Delete',
      confirmFunction: () => {
        const pathEnd = store.selection.path[store.selection.path.length-1];
        const index = pathEnd.index;
        if (store.selection.path.length > 1) {
          const parent = store.selection.path[store.selection.path.length-2].event;
          parent.members.splice(index, 1);
        } else {
          store.conf.events.splice(index, 1);
        }
        store.deselect();
      }
    });
  },
  // Move chime event upward in hierarchy
  decreaseIndent() {
    alert("decrease indent");
  },
  // Move chime event downward in hierarchy
  increaseIndent() {
    alert("increase indent");
  },
  // Move selected chime event upward in list
  moveUpward() {
    if (store.selection.event === null) {
      return;
    }
    const pathEnd = store.selection.path[store.selection.path.length-1];
    const index = pathEnd.index;
    if (index < 1) {
      return;
    }
    if (store.selection.path.length > 1) {
      const parent = store.selection.path[store.selection.path.length-2].event;
      const swap = parent.members[index-1];
      parent.members[index-1] = parent.members[index];
      parent.members[index] = swap;
    } else {
      const swap = store.conf.events[index-1];
      store.conf.events[index-1] = store.conf.events[index];
      store.conf.events[index] = swap;
    }
    pathEnd.index--;
  },
  // Move selected chime event downward in list
  moveDownward() {
    if (store.selection.event === null) {
      return;
    }
    const pathEnd = store.selection.path[store.selection.path.length-1];
    const index = pathEnd.index;
    if (store.selection.path.length > 1) {
      const parent = store.selection.path[store.selection.path.length-2].event;
      if (index >= parent.members.length-1) {
        return;
      }
      const swap = parent.members[index+1];
      parent.members[index+1] = parent.members[index];
      parent.members[index] = swap;
    } else {
      if (index >= store.conf.length-1) {
        return;
      }
      const swap = store.conf.events[index+1];
      store.conf.events[index+1] = store.conf.events[index];
      store.conf.events[index] = swap;
    }
    pathEnd.index++;
  },
  // Create or remove parts of the config data structure as appropriate in response to changes
  // (This is not a pretty implementation. More time could be spent to design something more elegant...)
  updateConf(event) {
    switch (event.match.date.type) {
      case 'all':
        if (typeof event.match.date.month !== "undefined") {
          delete event.match.date.month;
        }
        if (typeof event.match.date.day !== "undefined") {
          delete event.match.date.day;
        }
        if (typeof event.match.date.variant !== "undefined") {
          delete event.match.date.variant;
        }
      break;
      case 'specify':
        if (typeof event.match.date.month !== "object") {
          event.match.date.month = {
            type: 'specify',
            value: 'Jan'
          };
        }
        if (typeof event.match.date.day !== "object") {
          event.match.date.day = {
            type: 'fixed',
            value: 1
          };
        }
        if (typeof event.match.date.variant !== "undefined") {
          delete event.match.date.variant;
        }
        switch (event.match.date.day.type) {
          case 'fixed':
            if (typeof event.match.date.day.value !== "number") {
              event.match.date.day.value = 1;
            }
            if (typeof event.match.date.day.ordinal !== "undefined") {
              delete event.match.date.day.ordinal;
            }
          break;
          case 'floating':
            if (typeof event.match.date.day.value !== "string") {
              event.match.date.day.value = "Sun";
            }
            if (typeof event.match.date.day.ordinal !== "number") {
              event.match.date.day.ordinal = 1;
            }
          break;
        }
      break;
      case 'easter':
        if (typeof event.match.date.month !== "undefined") {
          delete event.match.date.month;
        }
        if (typeof event.match.date.day !== "undefined") {
          delete event.match.date.day;
        }
        if (typeof event.match.date.variant !== "string") {
          event.match.date.variant = 'western';
        }
      break;
    }
    switch (event.match.time.type) {
      case 'specify':
        if (typeof event.match.time.hour !== "object") {
          event.match.time.hour = {
            type: 'all',
          };
        }
        if (typeof event.match.time.minute !== "object") {
          event.match.time.minute = {
            type: 'specify',
            value: 0
          };
        }
        if (typeof event.match.time.event !== "undefined") {
          delete event.match.time.event;
        }
        if (typeof event.match.time.offset !== "undefined") {
          delete event.match.time.offset;
        }
        switch (event.match.time.hour.type) {
          case 'all':
            if (typeof event.match.time.hour.format !== "undefined") {
              delete event.match.time.hour.format;
            }
            if (typeof event.match.time.hour.value !== "undefined") {
              delete event.match.time.hour.value;
            }
          break;
          case 'specify':
            if (typeof event.match.time.hour.format !== "string") {
              event.match.time.hour.format = 'meridian';
            }
            if (typeof event.match.time.hour.value !== "number") {
              event.match.time.hour.value = 12;
            }
            switch (event.match.time.hour.format) {
              case 'meridian':
                if (event.match.time.hour.value < 1) {
                  event.match.time.hour.value += 12;
                } else if (event.match.time.hour.value > 12) {
                  event.match.time.hour.value -= 12;
                }
              break;
            }
          break;
        }
      break;
      case 'sun':
        if (typeof event.match.time.hour !== "undefined") {
          delete event.match.time.hour;
        }
        if (typeof event.match.time.minute !== "undefined") {
          delete event.match.time.minute;
        }
        if (typeof event.match.time.event !== "string") {
          event.match.time.event = 'rise';
        }
        if (typeof event.match.time.offset !== "number") {
          event.match.time.offset = 0;
        }
      break;
    }
  },
  // Handle click event for world map
  clickWorldMap(event) {
    const rect = event.target.getBoundingClientRect();
    const lat = 90.0 - (event.clientY - rect.y)*(180/rect.height);
    const lon = (event.clientX - rect.x)*(360/rect.width) - 180.0;
    store.latitudeSigned = lat;
    store.longitudeSigned = lon;
  },
  // Utility methods for computed getters and setters
  getCoordinates() {
    const arr = store.conf.location.split(" ");
    store.coords.lat = arr[0].slice(0,arr[0].length-1);
    store.coords.lon = arr[1].slice(0,arr[1].length-1);
    store.coords.latDir = arr[0].slice(-1);
    store.coords.lonDir = arr[1].slice(-1);
  },
  setCoordinates() {
    store.conf.location = store.coords.lat + store.coords.latDir + " " + store.coords.lon + store.coords.lonDir;
  },
  latitude: computed({
    get: () => {
      store.getCoordinates();
      return store.coords.lat;
    },
    set: (newLat) => {
      store.coords.lat = newLat;
      store.setCoordinates();
    },
  }),
  latitudeDirection: computed({
    get: () => {
      store.getCoordinates();
      return store.coords.latDir;
    },
    set: (newLatDir) => {
      store.coords.latDir = newLatDir;
      store.setCoordinates();
    },
  }),
  longitude: computed({
    get: () => {
      store.getCoordinates();
      return store.coords.lon;
    },
    set: (newLon) => {
      store.coords.lon = newLon;
      store.setCoordinates();
    },
  }),
  longitudeDirection: computed({
    get: () => {
      store.getCoordinates();
      return store.coords.lonDir;
    },
    set: (newLonDir) => {
      store.coords.lonDir = newLonDir;
      store.setCoordinates();
    },
  }),
  latitudeSigned: computed({
    get: () => {
      store.getCoordinates();
      return Number(store.coords.lat) * (store.coords.latDir == 'N' ? 1.0 : -1.0);
    },
    set: (newLat) => {
      store.coords.lat = Math.abs(newLat);
      store.coords.latDir = (newLat >= 0 ? 'N' : 'S');
      store.setCoordinates();
    },
  }),
  longitudeSigned: computed({
    get: () => {
      store.getCoordinates();
      return Number(store.coords.lon) * (store.coords.lonDir == 'E' ? 1.0 : -1.0);
    },
    set: (newLon) => {
      store.coords.lon = Math.abs(newLon);
      store.coords.lonDir = (newLon >= 0 ? 'E' : 'W');
      store.setCoordinates();
    },
  }),
});

// Root component
const app = createApp({
  data() {
    return {
      // The widget has three pages, or steps, that the user progresses through
      page: 0,
      // Just a value used for fancy GUI feedback
      clipboardFeedback: false,
    };
  },
  setup() {
    return { store };
  },
  computed: {
    // Serialized payload for when the user is finished
    jsonOutput() {
      return JSON.stringify(store.conf);
    }
  },
  methods: {
    // On page 0, if the user opts to start with a default config ...
    importDefault() {
      let xhr = new XMLHttpRequest();
      let url = 'default.json';
      xhr.open('GET', url, true);
      xhr.responseType = 'json';
      xhr.onload = () => {
        if (xhr.status === 200) {
          store.conf = xhr.response;
        } else {
          console.log("HTTP response "+xhr.status);
        }
      };
      xhr.send();
    },
    // On page 0, if the user opts to upload a pre-existing conf file ...
    uploadConf() {
      store.showModal({
        title: "Upload Existing Config",
        confirmFunction: () => {
          let inp = document.getElementById("upload_conf_file");
          if (inp.files.length < 1) {
            return;
          }
          let file = inp.files[0];
          let url = URL.createObjectURL(file);
          let xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'json';
          xhr.onload = () => {
            if (xhr.status === 200) {
              store.conf = xhr.response;
            } else {
              console.log("HTTP response "+xhr.status);
            }
            URL.revokeObjectURL(url);
          };
          xhr.send();
          this.page++;
        },
        contentKey: 'uploadConf'
      });
    },
    // Show "Overlap Slots" help message
    overlapSlotsHelp() {
      store.showModal({
        title: "What are \"Overlap Slots?\"",
        confirmFunction: null,
        contentKey: 'overlapSlotsHelp'
      });
    },
    // Return number of chime events inside group
    getEventCount(group) {
      if (group.type != 'group' || typeof group.members === "undefined") {
        return 0;
      }
      let count = 0;
      for (let i=0; i < group.members.length; i++) {
        if (group.members[i].type == 'group') {
          count += this.getEventCount(group.members[i]);
        } else {
          count++;
        }
      }
      return count;
    },
    // Return list of all chime events matching the given sequence slot, recursively searching groups
    getCollisionList(n,events,enable,path) {
      let list = [];
      for (let i=0; i < events.length; i++) {
        let newPath = path.concat({
          index: i,
          label: events[i].label
        });
        if (events[i].type == 'group') {
          // for groups, descend and gather and matches within
          list.push(
            ...this.getCollisionList(
              n,
              events[i].members,
              (enable && events[i].enable),
              newPath
            )
          );
        } else if (events[i].type == 'event') {
          // if this is a match, add it
          if (events[i].sequence == n) {
            list.push({
              enable: (enable && events[i].enable),
              path: newPath,
              event: events[i]
            });
          }
        }
      }
      return list;
    },
    // On page 2, if the user opts to copy payload to clipboard ...
    copyJsonOutput() {
      let element = document.getElementById("json_output");
      element.select();
      document.execCommand('copy');
      this.clipboardFeedback = true;
      setTimeout(() => {this.clipboardFeedback = false;}, 1000);
    },
    // On page 2, if the user opts to directly download the payload as a Clockworth-ready config file ...
    downloadJsonOutput() {
      let output = document.getElementById("json_output");
      let anchor = document.createElement('a');
      anchor.setAttribute('href', 'data:application/json,' + output.value);
      anchor.setAttribute('download', "clockworth.json");
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    },
  }
});

// Component for a chime event (or group) in the master list (the pane on the left).
// If event.type=='group', this component is recursive.
app.component('chime-event', {
  name: 'ChimeEvent',
  props: [
    'event', // the chime event
    'index', // index in the parent's member list
    'depth', // current depth of hierarchy
    'has-next-sibling', // false if last in parent's member list
    'path' // path from root of event hierarchy
  ],
  data() {
    return {
      open: true // GUI state to make groups collapsible
    };
  },
  setup() {
    return { store };
  },
  computed: {
    // Augmented path that includes this chime event
    nextPath() {
      return this.path.concat({
        index: this.index,
        label: this.event.label,
        hasNextSibling: this.hasNextSibling
      });
    }
  },
  template: '<li v-if="event.type == \'group\'" style="position:relative" :class="event.enable?\'\':\'disable\'"> \
      <div class="event-heading"> \
        <span :class="\'drawer-button \' + (open ? \'open\' : \'\')" @click="open = !open">&#x25B8;</span> \
        <div :class="\'event-bar selectable\'+(store.selection.event===event?\' selected\':\'\')" @click="store.select" :data-path="JSON.stringify(nextPath)"> \
          <span> \
            <svg viewBox="0 0 24 24" style="width:1em;height:1em;"> \
              <use href="img/icons.svg#folder"/> \
            </svg> \
          </span> \
          <span>{{ event.label }}</span> \
        </div> \
        <svg v-if="!event.enable" viewBox="0 0 24 24" style="width:1em;height:1em;"> \
          <use href="img/icons.svg#hidden"/> \
        </svg> \
      </div> \
      <ul v-if="event.members.length > 0" :class="open ? \'open\':\'\'"> \
        <chime-event v-for="(member, subindex) in event.members" :event="member" :index="subindex" :depth="depth+1" :has-next-sibling="subindex < event.members.length-1" :path="nextPath"></chime-event> \
      </ul> \
      <hierarchy-lines v-if="depth>0" :index="index" :depth="depth" :path="path"></hierarchy-lines> \
    </li> \
    <li v-else-if="event.type == \'event\'" style="position:relative" :class="event.enable?\'\':\'disable\'"> \
      <div class="event-heading"> \
        <div :class="\'event-bar selectable\'+(store.selection.event===event?\' selected\':\'\')" @click="store.select" :data-path="JSON.stringify(nextPath)"> \
          <span> \
            <svg viewBox="0 0 24 24" style="width:1em;height:1em;"> \
              <use href="img/icons.svg#music"/> \
            </svg> \
          </span> \
          <span>{{ event.label }}</span> \
        </div> \
        <svg v-if="!event.enable" viewBox="0 0 24 24" style="width:1em;height:1em;"> \
          <use href="img/icons.svg#hidden"/> \
        </svg> \
      </div> \
      <hierarchy-lines v-if="depth>0" :index="index" :depth="depth" :path="path"></hierarchy-lines> \
    </li>'
});

// Purely graphical component for drawing hierarchy lines
app.component('hierarchy-lines', {
  name: 'HierarchyLines',
  props: [
    'depth', // current depth of hierarchy
    'index', // index in the parent's member list
    'path' // data about ancestors in the hierarchy
  ],
  template: '<template v-for="(item, i) in path"> \
      <div v-if="item.hasNextSibling" class="hierarchy-parent" :style="\'left:\'+((depth-i+1)*-26+4)+\'px;\'"></div> \
    </template> \
    <div class="hierarchy-item" v-if="index==0" style="height:1em;top:0;"></div> \
    <div class="hierarchy-item" v-else style="height:3em;top:-2em;"></div>'
});

window.vm = app.mount('#app');

