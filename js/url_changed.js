import { app } from "../../scripts/app.js";
/* import { api } from "../../scripts/api.js";

function nodeFeedbackHandlerBr(event) {
  const { node_id, widget_name, type, data } = event.detail;
  const nodes = app.graph._nodes_by_id;
  const node = nodes[node_id];

  if (widget_name === "log") {
    console.log(`ED_log: ${data}`);
  }

  if (node && type === "text") {
    const widget = node.widgets.find((w) => w.name === widget_name);
    if (widget) {
      widget.value = data;
    }
  }
}

api.addEventListener("feedback_node_br", nodeFeedbackHandlerBr); */

//////////////////////////////////////////////////////////

let initialized = false;

export const findWidgetByName = (node, name) => {
    return node.widgets ? node.widgets.find((w) => w.name === name) : null;
};

const doesInputWithNameExist = (node, name) => {
    return node.inputs ? node.inputs.some((input) => input.name === name) : false;
};

// Create a map of node titles to their respective widget handlers
const nodeWidgetHandlers = {
    "Get Booru Tag 💬ED": {
        'url': handleGetBooruTag
    },
};

// In the main function where widgetLogic is called
function widgetLogic(node, widget) {
    // Retrieve the handler for the current node title and widget name
    const handler = nodeWidgetHandlers[node.comfyClass]?.[widget.name];
    if (handler) {
        handler(node, widget);
    }
}


// Booru_loader_ED Handlers
async function handleGetBooruTag(node, widget) {
	//const adjustment  = node.size[1];
    const tagsWidget = findWidgetByName(node, "tags");

    // 태그 설정 함수
    function setTags(tags) {
        tagsWidget.value = tags.replaceAll(' ', ', ') + ",";
    }
    // 에러 표시
    function showError(error) {
        tagsWidget.value = 'Error: ' + error + '\n\n\n' + tagsWidget.value;
    }

    // 에러 처리 및 데이터 요청 함수
    async function fetchData(url) {
        try {
            const req = await fetch(url);
            if (!req.ok) throw new Error(`HTTP Error! Status Code: ${req.status}`);
            return await req.json();
        } catch (error) {
            showError(error);
            return null;
        }
    }

    if (widget.value.includes('danbooru')) {
        const url = widget.value.split("?")[0] + '.json';
        const data = await fetchData(url);
        if (data) setTags(data.tag_string_general);
    }

    if (widget.value.includes('gelbooru')) {
        const baseGelbooruUrl = "https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&pid=38&";
        const proxy = 'https://corsproxy.io/?';
        const match = /id=(\d+)/.exec(widget.value);

        if (match) {
            const url = proxy + encodeURIComponent(baseGelbooruUrl + match[0]);
            const data = await fetchData(url);
            if (data && data.post && data.post[0]) {
                setTags(data.post[0].tags);
            }
        } else {
            showError('ID was not found in Gelbooru URL.');
        }
    }
	//if (node.size[1] < adjustment) 	node.setSize([node.size[0], adjustment]);
}


app.registerExtension({
    name: "GetBooruTag.ed",
    nodeCreated(node) {
        for (const w of node.widgets || []) {
            let widgetValue = w.value;

            // Store the original descriptor if it exists
            let originalDescriptor = Object.getOwnPropertyDescriptor(w, 'value');
			if (!originalDescriptor) {
				originalDescriptor = Object.getOwnPropertyDescriptor(w.constructor.prototype, 'value');
			}

            widgetLogic(node, w);

            Object.defineProperty(w, 'value', {
                get() {
                    // If there's an original getter, use it. Otherwise, return widgetValue.
                    let valueToReturn = originalDescriptor && originalDescriptor.get
                        ? originalDescriptor.get.call(w)
                        : widgetValue;

                    return valueToReturn;
                },
                set(newVal) {

                    // If there's an original setter, use it. Otherwise, set widgetValue.
                    if (originalDescriptor && originalDescriptor.set) {
                        originalDescriptor.set.call(w, newVal);
                    } else {
                        widgetValue = newVal;
                    }

                    widgetLogic(node, w);
                }
            });
        }
        setTimeout(() => {initialized = true;}, 500);
    }
});

