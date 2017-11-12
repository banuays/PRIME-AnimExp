/**
 * bpmn-js-seed - async
 *
 * This is an example script that loads a bpmn diagram <diagram.bpmn> and opens
 * it using the bpmn-js viewer.
 *
 * YOU NEED TO SERVE THIS FOLDER VIA A WEB SERVER (i.e. Apache) FOR THE EXAMPLE TO WORK.
 * The reason for this is that most modern web browsers do not allow AJAX requests ($.get and the like)
 * of file system resources.
 */
var $ = require('jquery');
var BpmnViewer = require('bpmn-js'),

    //EmbeddedComments = require('bpmn-js-embedded-comments'),
    ZoomScroll = require('diagram-js/lib/navigation/zoomscroll'),
    MoveCanvas = require('diagram-js/lib/navigation/movecanvas');
var viewer = new BpmnViewer({                
            container: '#canvas',
            additionalModules: [
                //EmbeddedComments,
                ZoomScroll,
                MoveCanvas
            ]});
//var checkBanu = require('bpmn-js/lib/util/ModelUtil.js');
var is = require('bpmn-js/lib/util/ModelUtil').is;
var modelingModule = require('bpmn-js/lib/features/modeling');

var Tree = require('./Tree').Tree;
var createFrgTree = require('./FragmentTree').createFrgTree;
//Global variables
var eventBus, event;
var loopCount=0;
var timerCoef=250;             //adjust the pace
var isStepAnimSelected=false;//if stepwise or cont animation selected
var isSelAnimSelected=false;
var isJustFollowNext=false;  //if only the following node needs to be clicked in stepwise anim
var nodetobeClicked=[]; //list of nodes that need to be clicked

//filters
var isRoleBasedAnimSelected=false;
var roleIdtobeAnimated;
var isCurObjInSelectedLane=false;
var isRandomFlowSelected=false;

var isPathSelected=false;
var isMultipleStartEvents=false;  //if there are multiple start events, user needs to select one
var selectedSeqFlowPathNum;
var selectedElementId;            //the id of the clicked element 
var seqFlowstobeClicked=[         //when the flow comes to an XOR diverging, the list of flows that user needs to clicj
    /*relatedXOR: id, 
    seqFlowId: id*/
];
var andGatewaysMerged=[           //list of converging parallel gateways. Keep track to wait all incoming at these points
    /*convAnd: id, 
    incSeqFlowId: id, 
    didFlowMerge: boolean*/
];
var gatewayCombination = [
    /*var divGatewayID, 
    var convGatewayID*/
];
var allObjects = [
    /*id,
    isPassed */
];

var lanes = [                       //list of lanes 
    /*laneId: element.id,
    laneSize:element.width,
    laneName: name*/
];
var startEvents=[/*element*/];
var numOfRepeats = 0;//kac kere end'e ulastigi. 
var timeoutsArray=[];
var particId;
//specific variables for Exp2
var processName; //name of the process used
var numofPrcDTaskDEnabled=0;
var numofPrcDTaskEEnabled=0;
var numofPrcDTaskGEnabled=0;
var numofPrcDTaskHEnabled=0;
var numofPrcDTaskHExecuted=0;
var numofPrcDTaskFEnabled=0;
var numofPrcDTaskNEnabled=0;
var numofPrcDUpperANDHEnabled=0;
var numofPrcDLowerANDHEnabled=0;
var numofPrcDANDHEnabled=0;
var isSeqFlowClickedAfterHExecutedOnce=false;
//---------
var prcTLTaskMExecuted = false;
var prcTLTaskNExecuted = false;
var prcTLConvOrEnabled = false;
var prcTLConvOrExecuted = false;
//---------
var prcLTaskAExecuted = false;
var prcLTaskBExecuted = false;
var prcLConvOrEnabled = false;
var prcLConvOrExecuted = false;
//----------
//following part is necessary for inner OR
var prcTLOTaskJExecuted = false;
var prcTLOTaskKExecuted = false;
var prcTLOTaskLExecuted = false;
var prcTLOInnerConvOrEnabled = false;
var prcTLOInnerConvOrExecuted = false;
//the rest of all is necessary for outer big OR
var prcTLOTaskAExecuted=false;
var prcTLOTaskGExecuted=false;
var prcTLOTaskIExecuted=false;
var prcTLOTaskFExecuted=false;
var prcTLOOuterConvORLowerSeqExecuted=false;
var prcTLOdidLowerPathReachOuterConvOr=false;
//-------------
var numofPrcTLMTaskFEnabled=0;
//Add console -------------------
/*var consoles = document.querySelector('#js-console');
function log() {
    consoles.value += Array.prototype.slice.call(arguments).map(function(e) {
        return String(e);
    }).join(' ');
    consoles.value += '\n';
    consoles.scrollTop = consoles.scrollHeight;
  }*/
//-------------------------------
// Import and open default xml diagram--------------
//--------------------------------------------------
function openDiagram(diagram) {
    viewer.importXML(diagram, function(err) {
      if (!err) {
        resetAll();
        $('[canvasVideoArea]').hide();
        $('[canvasOverlayArea2]').hide();
        //log('File loaded!');
        viewer.get('canvas').zoom('fit-viewport');
        //Get lanes so that we put lane names through the diagram
        elementRegistry = viewer.get('elementRegistry');
        //var lanes = [];
        lanes.length=0;
        var elements = elementRegistry.filter(function(element) {
            if(is(element, 'bpmn:Lane')){
                var objToParse = element.businessObject;//Base
                var name = objToParse.name;
                lanes.push({
                    laneId: element.id,
                    laneSize:element.width,
                    laneName: name
                });
            }
        });
        //put overlays through a loop in every 750 px. Show each 750px on low zoom and 1500px on high zoom
        var overlays = viewer.get('overlays');
        for(var k=0; k<lanes.length;k++){
          var overlayPosition=400;
            var name = lanes[k].laneName;//.replace(/\s+/g, '');
            var numOfRepeatsinLane=0;
            while(overlayPosition < lanes[k].laneSize){
                var minZoomV=0;
                if(numOfRepeatsinLane%4==0 || numOfRepeatsinLane%4==2){
                    minZoomV=1.2;
                }else if (numOfRepeatsinLane%4==1){
                    minZoomV=0.7;
                }
                overlays.add(lanes[k].laneId, {
                  position: {
                    top: 0,
                    left: overlayPosition
                  },
                    show: {
                    minZoom: minZoomV,
                    maxZoom: 5.0
                  },
                  html: '<div style="color:gray; font-style:italic; font-size:12px; white-space: nowrap">' + name + '</div>'
                });
                overlayPosition = overlayPosition + 400;
                numOfRepeatsinLane++;
            }
        }
        //Populate role list combobox
        //populateRoleDropdown();
        } else {
        //log('something went wrong:', err);
      }
        //mouse wheel cevrildiginde zoom leveli kaydetmek icin event handler yaratalim
        //particId = processId();//removed for Exp2. Not yet implemented the particId
        document.getElementById("canvas").addEventListener("wheel", myFunction);
        function myFunction() {
            console.log("mouse cevirdik jsde");
            console.log(viewer.get('canvas').zoom(false));
            //For Exp2: disable zoom, always fix at default zoom.
            viewer.get('canvas').zoom('fit-viewport');
            //logExp("zoomPrc1Anim "+ viewer.get('canvas').zoom(false), particId);
        }
        //Exp2 remove Overlay2, it will be shown after video finishes. 
        $('[canvasOverlayArea2]').hide();
        //Exp2 let's create an event handler to turn back to bpmn canvas when video is finished
        var video = document.getElementsByTagName('video')[0];
        video.onended = function(e){
            $('[canvasVideoArea]').hide();
            $('[canvasOverlayArea2]').show();
            //Animation will start after approving the next overlay.
            //isStepAnimSelected = true;
            //initiateAnimation();
        };
        //event handlers for bpmn-io
        eventBus = viewer.get('eventBus');
        // you may hook into any of the following events
        events = [
          //'element.hover',
          //'element.out',
          'element.click',
          //'element.dblclick',
          //'element.mousedown',
          //'element.mouseup'
        ];
        events.forEach(function(event) {
          eventBus.on(event, function(e) {
              console.log('clicked to item '+e.element.id);
            // e.element = the model element
            // e.gfx = the graphical element
            //seq flow okunun kendisi yaninda ona bagli olan labela da tiklayabiliriz. O yuzden label click olursa da bakiyoruz.
            if(e.element.type.indexOf('StartEvent') != -1 && isMultipleStartEvents == true){
                //secilen start eventi bulup oradan animationi normal sekilde baslat
                //logExp(particId+" clickPrc1AnimStartEvent "+e.element.id, "WebLogger");
                markObjectAndSeqFlow(e.element.id, 'highlight', 'lime');
                //Secileni yesil yaptiktan sonra diger startlari da gray yapicaz. 
                for(var m = 0; m <startEvents.length; m++){
                    console.log('start event idleri gri yapcaz');
                    console.log(startEvents[m]);
                    console.log(e.element.id);
                    if(startEvents[m].id !== e.element.id){
                        console.log('secilmeyen start event: '+startEvents[m].id);
                        viewer.get('canvas').removeMarker(startEvents[m].id, 'highlight-toselect');
                        markObject(startEvents[m].id, 'highlight-light');
                    }
                }
                isMultipleStartEvents = false;
                var currShape = elementRegistry.get(e.element.id);
                var currShapeType = currShape.type;//bpmn:StartEvent
                var objToParse = currShape.businessObject;//Base 
                if(objToParse.get('outgoing')[0] === undefined)
                    return;
                var seqFlow = objToParse.get('outgoing');
                var pathNum = seqFlow.length;
                if(pathNum == 1){
                    findNextObject(seqFlow[0]);
                }
            }//start event degil herhangi bir seye tikladiysa alternatiflerden secim ya da stepwiseda ilerleme var mi diye bakiyoruz
            else{ //if(e.element.type.indexOf('SequenceFlow') != -1 || e.element.type.indexOf('label') != -1){//sectigimiz akis ise
                isPathSelected = true;
                selectedElementId = e.element.id.replace('_label','');
                //stepwise ve direk takip eden bir durum varsa
                if(isStepAnimSelected==true/* && isJustFollowNext==true*/){
                    //step durumunda bir sonraki noda tikliyoruz, seqa deil. 
                    var nodeSize = nodetobeClicked.length;
                    for(var m=0; m < nodeSize; m++){
                        //console.log(nodetobeClicked[m]);
                        if(nodetobeClicked[m].indexOf(selectedElementId) != -1){
                            //exp2: log also the nodes clicked
                            logExp("clickPrc1AnimNode "+selectedElementId, particId);
                            var currShape = elementRegistry.get(selectedElementId);
                            var nodetoParse = currShape.businessObject;//Base 
                            isJustFollowNext=false;
                            //viewer.get('canvas').removeMarker(nodetoParse.id, 'highlight-light');
                            loopCount=0;
                            markObjectAndSeqFlow(nodetoParse.id, 'highlight', 'lime');
                            //var for Exp2 to identify if multiple executions possible
                            var isClickOnMultipleExecTasksExp2PrcD = false;
                            var isClickOnMultipleExecTasksExp2PrcTLM = false;
                            //for exp2, if some elements are enabled more than once but executed less, we will enable them again. 
                            if(nodetoParse.id.indexOf('sid-8007DA64-E10A-4268-96FD-AC45E35FC049') != -1 && processName.indexOf('ProcessD-Similar') != -1){//if task D is clicked on PrcD
                                numofPrcDTaskDEnabled--;
                                isClickOnMultipleExecTasksExp2PrcD = true;
                                if(numofPrcDTaskDEnabled > 0){
                                    loopCount++;
                                    markCleanObject(nodetoParse.id, 'highlight');
                                    markCleanObject(nodetoParse.id, 'highlight-light');
                                    loopCount++;
                                    markObject(nodetoParse.id, 'highlight-light');
                                }else if(numofPrcDTaskDEnabled == 0){
                                    //this time we need to remove it from nodeToClick
                                    for(var n=0; n<nodetobeClicked.length;n++){
                                        if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                            nodetobeClicked.splice(n, 1);
                                        }
                                    }
                                }
                            }else if(nodetoParse.id.indexOf('sid-359F15FF-4D9D-46B9-8A32-67C7360D3702') != -1 && processName.indexOf('ProcessD-Similar') != -1){//if task E is clicked  on PrcD
                                numofPrcDTaskEEnabled--;
                                isClickOnMultipleExecTasksExp2PrcD = true;
                                if(numofPrcDTaskEEnabled > 0){
                                    loopCount++;
                                    markCleanObject(nodetoParse.id, 'highlight');
                                    markCleanObject(nodetoParse.id, 'highlight-light');
                                    loopCount++;
                                    markObject(nodetoParse.id, 'highlight-light');
                                }else if(numofPrcDTaskEEnabled == 0){
                                    //this time we need to remove it from nodeToClick
                                    for(var n=0; n<nodetobeClicked.length;n++){
                                        if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                            nodetobeClicked.splice(n, 1);
                                        }
                                    }
                                }   
                            }else if(nodetoParse.id.indexOf('sid-7F7C9D6E-7851-43B2-AF58-6CBA79DE5216') != -1 && processName.indexOf('ProcessD-Similar') != -1){//if task F is clicked  on PrcD
                                numofPrcDTaskFEnabled--;
                                isClickOnMultipleExecTasksExp2PrcD = true;
                                if(numofPrcDTaskFEnabled > 0){
                                    loopCount++;
                                    markCleanObject(nodetoParse.id, 'highlight');
                                    markCleanObject(nodetoParse.id, 'highlight-light');
                                    loopCount++;
                                    markObject(nodetoParse.id, 'highlight-light');
                                }else if(numofPrcDTaskFEnabled == 0){
                                    //this time we need to remove it from nodeToClick
                                    for(var n=0; n<nodetobeClicked.length;n++){
                                        if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                            nodetobeClicked.splice(n, 1);
                                        }
                                    }
                                }   
                            }else if(nodetoParse.id.indexOf('sid-7FA8EE72-9027-4F57-BB83-532CB06CDAB9') != -1 && processName.indexOf('ProcessD-Similar') != -1){//if task N is clicked  on PrcD
                                numofPrcDTaskNEnabled--;
                                isClickOnMultipleExecTasksExp2PrcD = true;
                                if(numofPrcDTaskNEnabled > 0){
                                    loopCount++;
                                    markCleanObject(nodetoParse.id, 'highlight');
                                    markCleanObject(nodetoParse.id, 'highlight-light');
                                    loopCount++;
                                    markObject(nodetoParse.id, 'highlight-light');
                                }else if(numofPrcDTaskNEnabled == 0){
                                    //this time we need to remove it from nodeToClick
                                    for(var n=0; n<nodetobeClicked.length;n++){
                                        if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                            nodetobeClicked.splice(n, 1);
                                        }
                                    }
                                }   
                            }else if(nodetoParse.id.indexOf('sid-C7D8EDC6-0198-4465-9D42-6E07051D53E6') != -1 && processName.indexOf('ProcessD-Similar') != -1){//if task G is clicked  on PrcD
                                numofPrcDTaskGEnabled--;
                                isClickOnMultipleExecTasksExp2PrcD = true;
                                if(numofPrcDTaskGEnabled > 0){
                                    loopCount++;
                                    markCleanObject(nodetoParse.id, 'highlight');
                                    markCleanObject(nodetoParse.id, 'highlight-light');
                                    loopCount++;
                                    markObject(nodetoParse.id, 'highlight-light');
                                }else if(numofPrcDTaskGEnabled == 0){
                                    //this time we need to remove it from nodeToClick
                                    for(var n=0; n<nodetobeClicked.length;n++){
                                        if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                            nodetobeClicked.splice(n, 1);
                                        }
                                    }
                                }   
                                //We will also check the decision on converging before H. For this, we count the times seq flow is enabled. (upper one after G)
                                numofPrcDUpperANDHEnabled++;
                            }else if(nodetoParse.id.indexOf('sid-EB98B6A4-4F1A-4720-A381-9E7557FEE0E2') != -1 && processName.indexOf('ProcessD-Similar') != -1){//if task H is clicked  on PrcD
                                console.log('H kac kere enabled oldu '+numofPrcDTaskHEnabled);
                                numofPrcDTaskHExecuted++;
                                //If Task H is already reached (enabled) twice, and clicked (executed) twice, we need to take care of next XOR diverging. The color choice should be enabled again after the first selection of seq flows. 
                                if(isSeqFlowClickedAfterHExecutedOnce == true){
                                    //no need to take care of double seq flow selection any more. 
                                    numofPrcDTaskHExecuted = 0;
                                }
                                
                                numofPrcDTaskHEnabled--;
                                isClickOnMultipleExecTasksExp2PrcD = true;
                                if(numofPrcDTaskHEnabled > 0){
                                    loopCount++;
                                    markCleanObject(nodetoParse.id, 'highlight');
                                    markCleanObject(nodetoParse.id, 'highlight-light');
                                    loopCount++;
                                    markObject(nodetoParse.id, 'highlight-light');
                                }else if(numofPrcDTaskHEnabled == 0){
                                    //this time we need to remove it from nodeToClick
                                    for(var n=0; n<nodetobeClicked.length;n++){
                                        if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                            nodetobeClicked.splice(n, 1);
                                        }
                                    }
                                }   
                            }
                            
                            //the following part is for Prc ThreeLevel
                            else if(nodetoParse.id.indexOf('sid-D5556F60-9623-4A3A-9CE9-65FBD8172693') != -1 && processName.indexOf('ThreeLevel') != -1){//if task M on PrcTL clicked
                                prcTLTaskMExecuted = true;
                                
                            }else if(nodetoParse.id.indexOf('sid-A8C54355-7159-41DA-891E-06395D6C88D4') != -1 && processName.indexOf('ThreeLevel') != -1){//if task N on PrcTL clicked
                                prcTLTaskNExecuted = true;
                            }else if(nodetoParse.id.indexOf('sid-B9FCF1BF-2060-48F4-8667-E6BB8B0C2870') != -1 && processName.indexOf('ThreeLevel') != -1){//if conv OR PrcTL clicked
                                //we need to remove M and N from nodetobeClicked as well (whichever is not yet clicked) and turn it to white again
                                var idOfMorNtoRemoveFromNodetoClick; 
                                if(prcTLTaskMExecuted == true){
                                    idOfMorNtoRemoveFromNodetoClick = 'sid-A8C54355-7159-41DA-891E-06395D6C88D4';
                                }else if(prcTLTaskNExecuted == true){
                                    idOfMorNtoRemoveFromNodetoClick = 'sid-D5556F60-9623-4A3A-9CE9-65FBD8172693';
                                }
                                for(var n=0; n<nodetobeClicked.length;n++){
                                    if(nodetobeClicked[n].indexOf(idOfMorNtoRemoveFromNodetoClick) != -1){ 
                                        nodetobeClicked.splice(n, 1);
                                    }
                                }
                                markCleanObject(idOfMorNtoRemoveFromNodetoClick, 'highlight-light');
                                loopCount++;
                            }
                            
                            //The following part is for PrcL-Similar
                            else if(nodetoParse.id.indexOf('sid-2CE90F39-ED85-4DD1-AA4A-19C39F8FB2FC') != -1 && processName.indexOf('ProcessL-Similar') != -1){//if task A on PrcL clicked
                                prcLTaskAExecuted = true;
                            }else if(nodetoParse.id.indexOf('sid-0408842D-8C50-4639-8D12-B4DD2B96C719') != -1 && processName.indexOf('ProcessL-Similar') != -1){//if task B on PrcL clicked
                                prcLTaskBExecuted = true;
                                
                            }else if(nodetoParse.id.indexOf('sid-D4CD6B85-92DA-45F6-BCCB-F9289102B5AA') != -1 && processName.indexOf('ProcessL-Similar') != -1){//if first conv OR PrcL clicked
                                //we need to remove A and B from nodetobeClicked as well (whichever is not yet clicked) and turn it to white again
                                var idOfAorBtoRemoveFromNodetoClick; 
                                if(prcLTaskAExecuted == true){
                                    idOfAorBtoRemoveFromNodetoClick = 'sid-0408842D-8C50-4639-8D12-B4DD2B96C719';
                                }else if(prcLTaskBExecuted == true){
                                    idOfAorBtoRemoveFromNodetoClick = 'sid-2CE90F39-ED85-4DD1-AA4A-19C39F8FB2FC';
                                }
                                for(var n=0; n<nodetobeClicked.length;n++){
                                    if(nodetobeClicked[n].indexOf(idOfAorBtoRemoveFromNodetoClick) != -1){ 
                                        nodetobeClicked.splice(n, 1);
                                    }
                                }
                                markCleanObject(idOfAorBtoRemoveFromNodetoClick, 'highlight-light');
                                loopCount++;
                            }
                            //The following part is for TwoLevel-OR
                            //first, assign for inner OR
                            else if(nodetoParse.id.indexOf('sid-EF09FCDB-A858-4214-86DF-86C0A81731DD') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if task J on PrcTLO clicked
                                prcTLOTaskJExecuted = true;
                            }else if(nodetoParse.id.indexOf('sid-0973BCCA-F992-4275-995A-88DBA619EE1A') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if task K on PrcTLO clicked
                                prcTLOTaskKExecuted = true;
                            }else if(nodetoParse.id.indexOf('sid-A7DB9084-23A3-4DD0-90E0-742C18616BFA') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if task L on PrcTLO clicked
                                prcTLOTaskLExecuted = true;
                            }else if(nodetoParse.id.indexOf('sid-84238CE5-A20F-4E5B-A6C8-B286CEABE731') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if inner conv OR PrcTLO clicked
                                //we need to remove J, K and L from nodetobeClicked as well (whichever is not yet clicked) and turn it to white again. We have two to remove because OR structure has 3 paths. 
                                console.log('buraya da mi gelmiyor');
                                console.log('sirayla durumlari ne '+prcTLOTaskJExecuted+prcTLOTaskKExecuted+prcTLOTaskLExecuted);
                                if(prcTLOTaskJExecuted == false){
                                   markCleanObject('sid-EF09FCDB-A858-4214-86DF-86C0A81731DD', 'highlight-light');
                                    loopCount++;
                                }
                                if(prcTLOTaskKExecuted == false){
                                   markCleanObject('sid-0973BCCA-F992-4275-995A-88DBA619EE1A', 'highlight-light');
                                    loopCount++;
                                }if(prcTLOTaskLExecuted == false){
                                   markCleanObject('sid-A7DB9084-23A3-4DD0-90E0-742C18616BFA', 'highlight-light');
                                    loopCount++;
                                }
                                
                                for(var n=0; n<nodetobeClicked.length;n++){
                                    if(nodetobeClicked[n].indexOf('sid-EF09FCDB-A858-4214-86DF-86C0A81731DD') != -1 || nodetobeClicked[n].indexOf('sid-0973BCCA-F992-4275-995A-88DBA619EE1A') != -1 || nodetobeClicked[n].indexOf('sid-A7DB9084-23A3-4DD0-90E0-742C18616BFA') != -1 ){
                                        nodetobeClicked.splice(n, 1);
                                    }
                                }
                                prcTLOTaskJExecuted = false;
                                prcTLOTaskKExecuted = false;
                                prcTLOTaskMExecuted = false;
                                console.log(nodetobeClicked);
                                
                                //markCleanObject(idOfJKorLtoRemoveFromNodetoClick1, 'highlight-light');
                                //loopCount++;
                                //markCleanObject(idOfJKorLtoRemoveFromNodetoClick2, 'highlight-light');
                                //loopCount++;
                                console.log('sildikten sonra hersey duzgun mu?');
                            }
                            //first, assign for outer OR for Process TLO
                            else if(nodetoParse.id.indexOf('sid-77C15100-15C9-4930-8137-D138944B7971') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if task A on PrcTLO clicked
                                prcTLOTaskAExecuted = true;
                                
                            }else if(nodetoParse.id.indexOf('sid-EFC66FA7-4D9A-4ED1-B058-95F91A413BD2') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if task G on PrcTLO clicked
                                prcTLOTaskGExecuted = true;
                                
                            }else if(nodetoParse.id.indexOf('sid-1D1409CE-7451-4384-A0BE-43FF8AB2426E') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if task I on PrcTLO clicked
                                prcTLOTaskIExecuted = true;
                                
                            }else if(nodetoParse.id.indexOf('sid-F684335A-2A88-4473-85EC-5ADF0A4C5BB9') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if task I on PrcTLO clicked
                                prcTLOTaskFExecuted = true;
                            }else if(nodetoParse.id.indexOf('sid-BDF017DE-8C00-4CE1-9A3F-C254D51AF719') != -1 && processName.indexOf('TwoLevel-OR') != -1){//if outer conv OR PrcTLO clicked
                                console.log('surec nerden geldi diye isaretlendi '+prcTLOdidLowerPathReachOuterConvOr);
                                console.log('G executed mi '+prcTLOTaskGExecuted+' I executed mi '+prcTLOTaskIExecuted + ' asagidaki secim secilmis mi '+prcTLOdidLowerPathReachOuterConvOr);
                                var doesFlowContinueAfterOR=true;
                                if(prcTLOdidLowerPathReachOuterConvOr == false){
                                    //reached from upper part. We need to check if lower is initiated
                                    if(prcTLOTaskGExecuted == false && prcTLOTaskIExecuted == false){
                                        //only one part is executed. the user can continue
                                       //remove them from to be clicked
                                        for(var n=0; n<nodetobeClicked.length;n++){
                                            if(nodetobeClicked[n].indexOf('sid-EFC66FA7-4D9A-4ED1-B058-95F91A413BD2') != -1 || nodetobeClicked[n].indexOf('sid-1D1409CE-7451-4384-A0BE-43FF8AB2426E') != -1){ 
                                            nodetobeClicked.splice(n, 1);
                                            }
                                        }
                                        markCleanObject('sid-EFC66FA7-4D9A-4ED1-B058-95F91A413BD2', 'highlight-light');
                                        loopCount++;
                                        markCleanObject('sid-1D1409CE-7451-4384-A0BE-43FF8AB2426E', 'highlight-light');
                                        loopCount++;
                                    }else{
                                        doesFlowContinueAfterOR=false;
                                    }
                                }else if(prcTLOdidLowerPathReachOuterConvOr == true){
                                    //reached from lower part. We need to check if lower is initiated
                                    if(prcTLOTaskAExecuted == false){
                                        //only one part is executed. the user can continue
                                       //remove them from to be clicked
                                        for(var n=0; n<nodetobeClicked.length;n++){
                                            if(nodetobeClicked[n].indexOf('sid-77C15100-15C9-4930-8137-D138944B7971') != -1){ 
                                            nodetobeClicked.splice(n, 1);
                                            }
                                        }
                                        markCleanObject('sid-77C15100-15C9-4930-8137-D138944B7971', 'highlight-light');
                                        loopCount++;
                                    }else{
                                        doesFlowContinueAfterOR=false;
                                    }
                                }
                                if(doesFlowContinueAfterOR==false){
                                    markCleanObject('sid-BDF017DE-8C00-4CE1-9A3F-C254D51AF719', 'highlight');
                                    markObject('sid-BDF017DE-8C00-4CE1-9A3F-C254D51AF719', 'highlight-light');
                                    markSeqFlowwithGivenId('sid-FDFAC7BF-7A9C-4AA0-8B9A-962D0313F9D9', 'Black');
                                    return;
                                }
                            }
                            //The following part is for TwoLevel-Mismatch
                            else if(nodetoParse.id.indexOf('sid-F684335A-2A88-4473-85EC-5ADF0A4C5BB9') != -1 && processName.indexOf('TwoLevel-Mismatch') != -1){//Task F is clicked on TLM
                                numofPrcTLMTaskFEnabled--;
                                isClickOnMultipleExecTasksExp2PrcTLM = true;
                                if(numofPrcTLMTaskFEnabled > 0){
                                    loopCount++;
                                    markCleanObject(nodetoParse.id, 'highlight');
                                    markCleanObject(nodetoParse.id, 'highlight-light');
                                    loopCount++;
                                    markObject(nodetoParse.id, 'highlight-light');
                                }else if(numofPrcTLMTaskFEnabled == 0){
                                    //this time we need to remove it from nodeToClick
                                    for(var n=0; n<nodetobeClicked.length;n++){
                                        if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                            nodetobeClicked.splice(n, 1);
                                        }
                                    }
                                }
                            }
                            
                            //before we continue, we need to remove the clicked element from nodetobeClicked list. 
                            //specific to Exp2, if only this click is on something not multiple executed, then remove it.  
                            if(isClickOnMultipleExecTasksExp2PrcD = false){
                                for(var n=0; n<nodetobeClicked.length;n++){
                                    if(nodetobeClicked[n].indexOf(selectedElementId) != -1){//bu secilen aslinda seq degil node 
                                        nodetobeClicked.splice(n, 1);
                                    }
                                }
                            }
                            console.log('buranin bir ilgisi yok ama sorun var mi ');
                            console.log(nodetoParse.get('outgoing')[0]);
                            findNextObject(nodetoParse.get('outgoing')[0]);
                            //if we found the node to be clicked in step anim, we won't go further to search for seq flow check
                            return;
                        }
                    }
                }
                var clickedGatewayPath;
                for(i=0; i<seqFlowstobeClicked.length;i++){
                    if(seqFlowstobeClicked[i].seqFlowId == selectedElementId){
                    logExp("clickPrc1AnimAltPath "+selectedElementId, particId);
                    //logExp(particId+" clickPrc1AnimAltPath "+selectedElementId, "WebLogger");
                        var currShape = elementRegistry.get(selectedElementId);
                        var seqFlowToParse = currShape.businessObject;//Base 
                        //artik bu XORa ait kollari tiklanacaklar listesinden cikarabiliriz
                        clickedGatewayPath = seqFlowstobeClicked[i].relatedXOR;
                        if(isRandomFlowSelected == false){
                            loopCount = 0;
                        }if(isRoleBasedAnimSelected == true && isCurObjInSelectedLane == true){
                            loopCount = 0;
                        }
                        for(var k = seqFlowstobeClicked.length - 1; k >= 0; k--){
                            if(seqFlowstobeClicked[k].relatedXOR === clickedGatewayPath) {
                               if(seqFlowstobeClicked[k].seqFlowId != selectedElementId){
                                    markSeqFlowwithGivenId(seqFlowstobeClicked[k].seqFlowId, 'Grey');
                                   //grilesen kolun baglandigi aktiviteyi de grilestirmek istersek
                                    /*var notSelShape = elementRegistry.get(seqFlowstobeClicked[k].seqFlowId);
                                    var seqFlowLighten = notSelShape.businessObject;//Base 
                                    markObject(seqFlowLighten.targetRef.id,  'highlight-light');*/
                                }
                                seqFlowstobeClicked.splice(k, 1);
                            }
                        }
                        markSeqFlowwithGivenId(selectedElementId, 'lime');
                        //specific to Exp2. I moved this to after the condition below.
                        //findNextObject(seqFlowToParse);
                    
                    //specific to Exp2. In PrcD for the last XOR, if it is enabled twice, we will repeat the same things performed when it reaches Div XOR upon click of the first one. The click must be on one of the outgoing flows. 
                    if((selectedElementId.indexOf('sid-52B3E917-9AD2-4525-A360-F8D5549A835F') != -1 || selectedElementId.indexOf('sid-BE538472-BF58-44D2-8734-C9BB76B7BE23') != -1 || selectedElementId.indexOf('sid-C019D1A5-E3E2-463C-8BB0-997D54780B78') != -1) && processName.indexOf('ProcessD-Similar') != -1){
                        //first, let's check if F and N are enabled twice
                        if(selectedElementId.indexOf('sid-52B3E917-9AD2-4525-A360-F8D5549A835F') != -1){
                            numofPrcDTaskFEnabled++;
                        }else if(selectedElementId.indexOf('sid-BE538472-BF58-44D2-8734-C9BB76B7BE23') != -1){
                            numofPrcDTaskNEnabled++;
                        }
                        
                        //if one of these seq flows are clicked after H is executed once, we don't need to keep track of possible double selection possibility anymore. 
                        if(numofPrcDTaskHExecuted == 1){
                            isSeqFlowClickedAfterHExecutedOnce = true;
                        }
                        console.log('seq flowu boyamak uzere asagidaki kisma giriyor mu? H kac kere execute edildi '+numofPrcDTaskHExecuted+' isSeqFlowClicked degiskeni false olmali, dogru mu '+isSeqFlowClickedAfterHExecutedOnce);
                        
                        if(numofPrcDTaskHExecuted == 2 && isSeqFlowClickedAfterHExecutedOnce == false){
                            //This means that the seq flow is clicked for the first time but H is executed twice. Now, we need to replay seq flow selection coloring again after it is selected for once. 
                            var prcDLastXORShape = elementRegistry.get('sid-C7ED6EC5-A181-42EB-A49D-50323E61B7EE');
                            var prcDLastXOR = prcDLastXORShape.businessObject;
                            var seqFlow = prcDLastXOR.get('outgoing');
                            var pathNum = seqFlow.length;

                            var nextObject = seqFlowToParse.targetRef;//This is the target of the clicked seq flow (N or F)
                            console.log('once seq sonra next object ne geliyor');
                            console.log(prcDLastXOR);
                            console.log(prcDLastXOR.id);

                            markCleanObject(prcDLastXOR.id, 'highlight');
                            loopCount++;
                            markObject(prcDLastXOR.id, 'highlight');

                            //we need to push again the seq flows of XOR. 
                            for(var i=0; i<pathNum;i++){
                                seqFlowstobeClicked.push({
                                    relatedXOR: prcDLastXOR.id, 
                                    seqFlowId: seqFlow[i].id});
                                    loopCount++;
                                    markSeqFlowwithGivenId(seqFlow[i].id, 'Black');
                                    loopCount++;
                                    markSeqFlowwithGivenId(seqFlow[i].id, 'Magenta');
                                    console.log(seqFlow[i].id);
                            }
                            console.log('yeni updateten sonra tiklanacaklar');
                            console.log(seqFlowstobeClicked);
                            //reset the variables. 
                            numofPrcDTaskHExecuted=0;
                            isSeqFlowClickedAfterHExecutedOnce=false;
                        }                        
                    }
                    //This part is for Prc TLO. We need to keep track of outer OR conv. If the bottom path is selected or not. 
                    if(selectedElementId.indexOf('sid-A9CDD35B-3693-4DC7-A9E2-9E1E0E6D90DD') != -1 && processName.indexOf('TwoLevel-OR') != -1){
                        prcTLOOuterConvORLowerSeqExecuted=true;
                    }
                    findNextObject(seqFlowToParse);
                    }
                }
            }//end of main if. What is the selected object type (seq flow, start event etc)
            if(isCurObjInSelectedLane == true){
                isCurObjInSelectedLane = false;
            }
          });
        });
    });

}
processName = processType();
var fs = require('fs');
if(processName.indexOf('ProcessD-Similar') != -1){
    var xmlDiagram = fs.readFileSync(__dirname + '/../resources/ProcessD-Similar.bpmn', 'utf-8');
}
else if(processName.indexOf('ProcessL-Similar') != -1){
    var xmlDiagram = fs.readFileSync(__dirname + '/../resources/ProcessL-Similar.bpmn', 'utf-8');
}else if(processName.indexOf('ThreeLevel') != -1){
    var xmlDiagram = fs.readFileSync(__dirname + '/../resources/ThreeLevel.bpmn', 'utf-8');
}else if(processName.indexOf('TwoLevel-OR') != -1){
    var xmlDiagram = fs.readFileSync(__dirname + '/../resources/TwoLevel-OR.bpmn', 'utf-8');
}else if(processName.indexOf('TwoLevel-Mismatch') != -1){
    var xmlDiagram = fs.readFileSync(__dirname + '/../resources/TwoLevel-Mismatch.bpmn', 'utf-8');
}else if(processName.indexOf('ProcessX-Similar') != -1){
    var xmlDiagram = fs.readFileSync(__dirname + '/../resources/ProcessX-Similar.bpmn', 'utf-8');
}

openDiagram(xmlDiagram);
//setTimeout(showAlertatStartUp, 500);
//Show alert at the beginning
function showAlertatStartUp(){
    var r = alert("Please go ahead with analyzing the model with the animation now.\n\n The animation will start immediately. Select a start event to continue.\nYou can analyze as long as you like. The animation will restart when the end event is reached.");
    $('[animStep-button-click]').prop('disabled', true);
    $('[animSel-button-click]').prop('disabled', true);
    var timeStamp = Math.floor(Date.now() / 1000); 
    //Butona basildigi zaman ile ayni is yapiliyor. 
    initiateAnimation();
}

function populateRoleDropdown(){
    $('[roleList-dropdown-click]').empty();
    var isRoleDropdownFilled = false;
    if(lanes.length > 0){
        for (i=0; i<lanes.length; i++){ 
           if(lanes[i].laneName.indexOf('undefined') == -1){//if the name is undefined, add it to the list. If everything is undefined, we need to disable the checkbox
               $('<option/>').val(lanes[i].laneName).html(lanes[i].laneName).appendTo('[roleList-dropdown-click]');
               isRoleDropdownFilled = true;
           }
        }
    }
    if(lanes.length == 0 || isRoleDropdownFilled == false){
        $('[roleFilter-click]').prop('disabled', true);
    }
}

//Open diagram from link on click-------------------
//--------------------------------------------------
var $diagramLink = $('[open-url-click]');
$diagramLink.on('click', function(){
    var x = new XMLHttpRequest();
    x.open("GET", "http://localhost/prime/resources/Blockstructure-2LevelPlus.bpmn", true);
    x.onreadystatechange = function () {
    if (x.readyState == 4 && x.status == 200){
        var doc = x.responseText;
        //var root = doc.documentElement;
        console.log(doc);
        openDiagram(doc);
        }
    };
    x.send(null);
});
//------------------------------------------------

//Open new diagram when selected from the browser---
//--------------------------------------------------
var $file = $('[data-open-file]');
function readFile(file, done) {
  if (!file) {
    return done(new Error('no file chosen'));
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    done(null, e.target.result);
  };
  reader.readAsText(file);
}

//Open diagram when a new model is selected, and ---
//initiate http request if necessary----------------
//--------------------------------------------------
$file.on('change', function() {
  readFile(this.files[0], function(err, xml) {

    if (err) {
      alert('could not read file, see console');
      return console.error('could not read file', err);
    }
    //add xml to server 
    /*var fd = new FormData();
    fd.append('filecontent', xml);
    fd.append('filename', "deniz");

    var xhrForm = new XMLHttpRequest();
    
    xhrForm.open("POST", "addFile.php");
    //console.log(path);
    //xhrForm.open("POST", "http://localhost/map/db_addBatch.php");
    xhrForm.send(fd); */
    //end of add xml to server
    xmlDiagram = xml;
    openDiagram(xml);
  });
});

////// file drag / drop ///////////////////////
//--------------------------------------------------
function openFile(file, callback) {
  // check file api availability
  if (!window.FileReader) {
    return window.alert(
      'Looks like you use an older browser that does not support drag and drop. ' +
      'Try using a modern browser such as Chrome, Firefox or Internet Explorer > 10.');
  }
  // no file chosen
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var xml = e.target.result;
    callback(xml);
  };
  reader.readAsText(file);
}

//For php connection--------------------------------
//--------------------------------------------------
    function reqListener () {
      console.log(this.responseText);
    }
//Asagidaki modellist'i gostermek icin olan kismi simdilik kaldiriyorum. 
/*var $listButton = $('[model-list-div]');
var $listDiv = $('[modelListDiv]');
var aaa;
    var oReq = new XMLHttpRequest(); //New request object
    oReq.onload = function() {
        //This is where you handle what to do with the response.
        //The actual data is found on this.responseText
        aaa = this.responseText; 
        //alert(aaa); //Will alert: 42
        $("#modellist").html(aaa);
        //document.getElementByID("modellist").innerHTML="afsdfsdf";
        listDiv.value=aaa;
    };
    oReq.open("get", "getFileList.php", true);
    //oReq.open("get", "getFileContent.php?id=2", true);
    //                               ^ Don't block the rest of the execution.
    //                                 Don't wait until the request finishes to 
    //                                 continue.
    oReq.send();

$(document).ready(function(){
    console.log(this.$id);
    $(".modelLink").click(showModelFromDB(2));
});
function showModelFromDB(id){
    var oReq1 = new XMLHttpRequest(); //New request object
    oReq1.onload = function() {
        var bbb = this.responseText; 
        //alert(bbb);
        console.log(bbb);
        openDiagram(bbb);
    };
    oReq1.open("get", "getFileContent.php?id="+id, true);
    oReq1.send();
    return false;
    
}*/
//end of for php connection

//Highlight the given object with given color in----
//given loop count timer----------------------------
//--------------------------------------------------
function doSetTimeoutObj(highId, loopCountC, color){
    var highIdd = highId;
    timeoutsArray[timeoutsArray.length] = setTimeout(function(){
        viewer.get('canvas').addMarker(highId, color);}
               , loopCountC);
}
//Clean object before marking it with something new------
//-------------------------------------------------------
function doSetTimeoutCleanObj(highId, loopCountC, color){
    var highIdd = highId;
    timeoutsArray[timeoutsArray.length] = setTimeout(function(){
        viewer.get('canvas').removeMarker(highId, color);}
               , loopCountC);
}
//Highlight the given flow with given color in------
//given loop count timer----------------------------
//--------------------------------------------------
function doSetTimeoutFlow(seqFlow1, loopCountC, color){
    //var myTimer = setTimeout(setMarker(highIdd, canvasA), loopCountC);//nextObjectin bas
    timeoutsArray[timeoutsArray.length] = setTimeout(function(){
        //color only the first sequence flow
        var outgoingGfx = viewer.get('elementRegistry').getGraphics(seqFlow1.id);
        outgoingGfx.select('path').attr({stroke: color});
    }, loopCountC);
}
//alert the user at the end of the animation------
//--------------------------------------------------
function doSetTimeoutEndAlert(loopCountC){
    //var myTimer = setTimeout(setMarker(highIdd, canvasA), loopCountC);//nextObjectin bas
    timeoutsArray[timeoutsArray.length] = setTimeout(function(){
        //color only the first sequence flow
        alert('Please Restart to play the animation again.');
    }, loopCountC);
}
function doSetTimeoutResetandInitiate(loopCountC){
    //var myTimer = setTimeout(setMarker(highIdd, canvasA), loopCountC);//nextObjectin bas
    timeoutsArray[timeoutsArray.length] = setTimeout(function(){
        //color only the first sequence flow
        resetandInitiateAnim();
    }, loopCountC);
}
//Animate all alternative seq flows when full animation clicked----
//-----------------------------------------------------------------
var $buttonanimFull = $('[animFull-button-click]');
$buttonanimFull.on('click', function(){
    //log('Anim started');
    timerCoef=1000;
    Tree = createFrgTree(viewer);
    console.log('butondan tree: ');
    console.log(Tree);
    //console.log(viewer.definitions); Banu: the whole process tree
    canvas = viewer.get('canvas'),
    overlays = viewer.get('overlays'),
    elementRegistry = viewer.get('elementRegistry');
    //Get start element
    var elements = elementRegistry.filter(function(element) {
      return is(element, 'bpmn:StartEvent');
    });
    //Add marker to the first element of the first fragment (start event)
    var startEventID = Tree._root.data.strtID;
    console.log('start idsi su: '+startEventID);
    
    markObjectAndSeqFlow(startEventID, 'highlight', 'lime');
    highlightFrgsRecursive(Tree._root);
    markObjectAndSeqFlow(Tree._root.data.endID, 'highlight', 'lime');
});

//Animate automatically but expect the user to select conditions----
//------------------------------------------------------------------
var $buttonanimSel = $('[animSel-button-click]');
$buttonanimSel.on('click', function(){
    isSelAnimSelected = true;
    initiateAnimation();
});

//Animate stepwise. The user needs to make a selection at every step----
//----------------------------------------------------------------------
var $buttonanimStep = $('[animStep-button-click]');
$buttonanimStep.on('click', function(){
        //log('Anim started');
    //console.log(viewer.definitions); Banu: the whole process tree
    logExp("SelAnimRestarted ", particId);
    resetandInitiateAnim();
    isStepAnimSelected = true;
    initiateAnimation();
});

//Reset the animation and restart with the original settings-------
//-----------------------------------------------------------------
var $buttonReset = $('[reset-button-click]');
$buttonReset.on('click', function(){
    //location.reload(); 
    logExp("SelAnimCleared ", particId);
    resetandInitiateAnim();
});

//Start the animation tutorial-------
//-----------------------------------------------------------------
var $buttonanimTutor = $('[animTutorial-button-click]');
$buttonanimTutor.on('click', function(){
    window.open('tutorial-web.html','_parent',false);
});

//Open diagram from link on click-------------------
//--------------------------------------------------
var $diagramLink = $('[IssueMan-button-click]');
$diagramLink.on('click', function(){
    var x = new XMLHttpRequest();
    x.open("GET", "../resources/IssueManagement.bpmn", true);
    x.onreadystatechange = function () {
    if (x.readyState == 4 && x.status == 200){
        var doc = x.responseText;
        //var root = doc.documentElement;
        console.log(doc);
        xmlDiagram = doc;
        openDiagram(doc);
        }
    };
    x.send(null);
});

//Open diagram from link on click-------------------
//--------------------------------------------------
var $diagramLink = $('[openMT5File-button-click]');
$diagramLink.on('click', function(){
    var x = new XMLHttpRequest();
    x.open("GET", "../resources/MT5.bpmn", true);
    x.onreadystatechange = function () {
    if (x.readyState == 4 && x.status == 200){
        var doc = x.responseText;
        //var root = doc.documentElement;
        console.log(doc);
        xmlDiagram = doc;
        openDiagram(doc);
        }
    };
    x.send(null);
});
//Open diagram from link on click-------------------
//--------------------------------------------------
var $diagramLink = $('[simpleScan-button-click]');
$diagramLink.on('click', function(){
    var x = new XMLHttpRequest();
    x.open("GET", "../resources/simplescan.bpmn", true);
    x.onreadystatechange = function () {
    if (x.readyState == 4 && x.status == 200){
        var doc = x.responseText;
        //var root = doc.documentElement;
        console.log(doc);
        xmlDiagram = doc;
        openDiagram(doc);
        }
    };
    x.send(null);
});
//Open diagram from link on click-------------------
//--------------------------------------------------
var $diagramLink = $('[defBlockStr-button-click]');
$diagramLink.on('click', function(){
    var x = new XMLHttpRequest();
    x.open("GET", "../resources/Blockstructure-2LevelPlus.bpmn", true);
    x.onreadystatechange = function () {
    if (x.readyState == 4 && x.status == 200){
        var doc = x.responseText;
        //var root = doc.documentElement;
        console.log(doc);
        xmlDiagram = doc;
        openDiagram(doc);
        }
    };
    x.send(null);
});
//Open diagram from link on click-------------------
//--------------------------------------------------
var $diagramLink = $('[defAndStr-button-click]');
$diagramLink.on('click', function(){
    var x = new XMLHttpRequest();
    x.open("GET", "../resources/Blockstructure-AND.bpmn", true);
    x.onreadystatechange = function () {
    if (x.readyState == 4 && x.status == 200){
        var doc = x.responseText;
        //var root = doc.documentElement;
        console.log(doc);
        xmlDiagram = doc;
        openDiagram(doc);
        }
    };
    x.send(null);
});

var $input = $('[pace-click]');
$input.on('change', function(){
    var newval=$(this).val();
    //logExp("clickPrc1AnimButtonPace "+newval, particId);
    //logExp(particId+" clickPrc1AnimButtonPace "+newval, "WebLogger");
    timerCoef = (-1)*newval;
});

var $filters = $('[showFilters-button-click]');
$filters.on('click', function(){
    populateRoleDropdown();
    var newval=$filters.text();
    if(newval.indexOf("Show Filters") != -1){
        //if not clicked before and now clicked, show the filters
        $filters.text("Hide Filters");
        $('#filterNavbar').show();
    }else{
        $filters.text("Show Filters");
        //document.getElementById("showFilters").textContent="Show Filters";
        $('#filterNavbar').hide();
    }
});

var $roleFilterCheck = $('[roleFilter-click]');
$roleFilterCheck.on('click', function(){
    populateRoleDropdown();
    var newval = $roleFilterCheck.is(':checked');
    if(newval == true){
        $roleList.attr("disabled", false);
        isRoleBasedAnimSelected = true;
        $('[animStep-button-click]').prop('disabled', true);
        //if enabled, the first role in the dropdown menu will be selected by default
        var roleNameFilter=$('[roleList-dropdown-click]').val();
        for(var i = 0; i < lanes.length; i++){
            if(lanes[i].laneName == roleNameFilter){
                roleIdtobeAnimated = lanes[i].laneId;
            }else{
                console.log('lane boyamaya geliyor mu');
                viewer.get('canvas').addMarker(lanes[i].laneId, 'lime');
            }
        }
        //also disable random click if this is enabled
        $('[randomFlow-click]').prop('disabled', true);
        isRandomFlowSelected = false;
    }else{
        $roleList.attr("disabled", true);
        //enable the stepped anim button only if the animation is not running
        if(isStepAnimSelected==false && isSelAnimSelected==false){
            $('[animStep-button-click]').prop('disabled', false);
        }
        isRoleBasedAnimSelected = false;
        //now we can also click random flow 
        $('[randomFlow-click]').prop('disabled', false);
    }
});

var $roleList = $('[roleList-dropdown-click]');
$('#filteringDiv').on('change', $roleList, function(){
    var roleNameFilter=$roleList.val();
    for(var i = 0; i < lanes.length; i++){
        if(lanes[i].laneName == roleNameFilter){
            roleIdtobeAnimated = lanes[i].laneId;
            return;
        }
    }
});

var $randomFlowCheck = $('[randomFlow-click]');
$randomFlowCheck.on('click', function(){
    var newval = $randomFlowCheck.is(':checked');
    if(newval == true){
        isRandomFlowSelected=true;
        //disable role filter click and remove assignments
        $('[roleFilter-click]').prop('disabled', true);
        $('[roleList-dropdown-click]').prop('disabled', true);
        isRoleBasedAnimSelected = false;
        roleIdtobeAnimated;
    }else{
        isRandomFlowSelected=false;
        //enable role filter click and return to previous settings
        $('[roleFilter-click]').prop('disabled', false);
        $('[roleList-dropdown-click]').prop('disabled', false);
        $('[roleFilter-click]').attr('checked', false);
    }
});

var $veryFirstAnimButton = $('[veryFirstAnim-button-click]');
$veryFirstAnimButton.on('click', function(){
    logExp("FirstExampleCasePlayed ", particId);
    $('[canvasOverlayArea]').hide(); 
    $('[canvasVideoArea]').show();
    document.getElementsByTagName('video')[0].play();
});

var $nowPlayAnimButton = $('[nowPlayAnim-button-click]');
$nowPlayAnimButton.on('click', function(){
    logExp("SelAnimInitiated ", particId);
    $('[canvasOverlayArea2]').hide(); 
    //$('[questionPart]').removeClass("questionsDivDisabled");
    $('[questionPart]').addClass("questionsDivEnabled");
    isStepAnimSelected = true;
    initiateAnimation();
});

var $replayExButton = $('[replayEx-button-click]');
$replayExButton.on('click', function(){
    logExp("ExtraExampleCasePlayed ", particId);
    $('[canvasVideoArea]').show();
    document.getElementsByTagName('video')[0].play();
});
//------------------------------------------------
function initiateAnimation(){
    //either when a button is clicked or user opens the page for the first time or returns back to start.
    $('[animStep-button-click]').prop('disabled', false);
    $('[animSel-button-click]').prop('disabled', true);
    //disable also role selection filters
    $('[roleFilter-click]').prop('disabled', true);
    $('[roleList-dropdown-click]').prop('disabled', true);
    $('[randomFlow-click]').prop('disabled', true);

    canvas = viewer.get('canvas');
    overlays = viewer.get('overlays');
    //timerCoef = 800;
    //butun elemanlarin uzerinden dolasip And diverging gateway olanlari bulup source seqlari ata
    elementRegistry = viewer.get('elementRegistry');
    var allElements = elementRegistry.getAll();
    setConvergingParallelGatewayArray(allElements);
    markSeqInOrder();
}

//Resetlemek icin fonksiyon. Restart dediginde, sona geldiginde ya da burdan basla dediginde kullan
function resetAll(){
    loopCount=0;
    //timerCoef=0;             //adjust the pace
    isStepAnimSelected=false;//if stepwise or cont animation selected
    //Disabled for Exp2. Only selanim used
    //isSelAnimSelected=false;
    isJustFollowNext=false;  //if only the following node needs to be clicked in stepwise anim
    nodetobeClicked.length=0; //list of nodes that need to be clicked

    isPathSelected=false;
    isMultipleStartEvents=false;  //if there are multiple start events, user needs to select one
    selectedSeqFlowPathNum=0;
    selectedElementId=0;            //the id of the clicked element 
    seqFlowstobeClicked.length=0;
    andGatewaysMerged.length=0;
    gatewayCombination.length=0;
    allObjects.length=0;
    startEvents.length=0;
    lanes.length=0;
    //Initiation for Exp2
    numofPrcDTaskDEnabled = 0;
    numofPrcDTaskEEnabled = 0;
    numofPrcDTaskGEnabled=0;
    numofPrcDTaskHEnabled = 0;
    numofPrcDTaskHExecuted = 0;
    numofPrcDTaskFEnabled=0;
    numofPrcDTaskNEnabled=0;
    numofPrcDUpperANDHEnabled = 0;
    numofPrcDLowerANDHEnabled = 0;
    numofPrcDANDHEnabled = 0;
    isSeqFlowClickedAfterHExecutedOnce=false;
    //--------
    prcTLTaskMExecuted = false;
    prcTLTaskNExecuted = false;
    prcTLConvOrEnabled = false;
    prcTLConvOrExecuted = false;
    //-----------
    prcLTaskAExecuted = false;
    prcLTaskBExecuted = false;
    prcLConvOrEnabled = false;
    prcLConvOrExecuted = false;
    //-------------
    prcTLOTaskJExecuted = false;
    prcTLOTaskKExecuted = false;
    prcTLOTaskLExecuted = false;
    prcTLOTaskFExecuted = false;
    prcTLOInnerConvOrEnabled = false;
    prcTLOInnerConvOrExecuted = false;
    prcTLOTaskAExecuted=false;
    prcTLOTaskGExecuted=false;
    prcTLOTaskIExecuted=false;
    prcTLOOuterConvORLowerSeqExecuted=false;
    prcTLOdidLowerPathReachOuterConvOr=false;
    //--------------
    numofPrcTLMTaskFEnabled = 0;
    //--------------
    
    isCurObjInSelectedLane=false;
    //reset all timeouts
    for(var i=0; i<timeoutsArray.length; i++){
        clearTimeout(timeoutsArray[i]);
    }
    timeoutsArray.length=0;
    //openDiagram(xmlDiagram);
    //if role based anim is not selected before, enable it
    if(isRoleBasedAnimSelected == false){
        $('[animStep-button-click]').prop('disabled', false);
    }
    $('[animSel-button-click]').prop('disabled', false);
    //enable also role selection filters
    $('[roleFilter-click]').prop('disabled', false);
    if(isRoleBasedAnimSelected == true)
        $('[roleList-dropdown-click]').prop('disabled', false);
    if(isRoleBasedAnimSelected == false){
        $('[roleList-dropdown-click]').prop('disabled', true);
        $('[randomFlow-click]').prop('disabled', false);
    }
    //removed for Exp2. No update for the pace
    //document.getElementById("paceclick").value = "-800";
}

function removeAllHighlights(){

    var regElements = viewer.get('elementRegistry').getAll();
    console.log(regElements[3].businessObject);
    console.log(regElements[5].businessObject);
    for(var i = 0; i < regElements.length; i++){
        //console.log
        if(regElements[i].businessObject.$type.indexOf('SequenceFlow') != -1){
            var outgoingGfx = viewer.get('elementRegistry').getGraphics(regElements[i].businessObject.id); 
            outgoingGfx.select('path').attr({stroke: 'black'});
        }else{
            viewer.get('canvas').removeMarker(regElements[i].businessObject.id, 'highlight');
            viewer.get('canvas').removeMarker(regElements[i].businessObject.id, 'highlight-light');
            viewer.get('canvas').removeMarker(regElements[i].businessObject.id, 'highlight-toselect');
        }
    }
}

function resetandInitiateAnim(){
    resetAll();
    removeAllHighlights();
    //openDiagram(xmlDiagram);
    //initiateAnimation();
}

var $input = $('[pace-click]');
$input.on('change', function(){
    var newval=$(this).val();
    //logExp("clickPrc1AnimButtonPace "+newval, particId);
    //logExp(particId+" clickPrc1AnimButtonPace "+newval, "WebLogger");
    timerCoef = (-1)*newval;
});


//Finalize the animation and go to questions-------
//-----------------------------------------------------------------
var $buttonanimFinish = $('[animFinish-button-click]');
$buttonanimFinish.on('click', function(){
    //location.reload(); 
    var response;
    console.log('seconds ' +parseInt(inSeconds));
    if(parseInt(inSeconds) > 0){
        response = confirm("Your suggested time did not finish yet. We suggest you to work more on it.\n Click OK to finish and Cancel to continue.");
    }else{
        response = confirm("Are you sure you want to finish?\n Click OK to finish and Cancel to continue.");
    }
    if(response == true){
        //logExp("finishPrc1Anim", particId);
        var runType = particId.slice(-1);
        window.open('process1_survey.html?ID='+particId,'_parent',false);
    }else{
        //numOfRepeats++;
    }
});

//Parse all converging parallel gateways at the beginning of the animation----
//----------------------------------------------------------------------------
function setConvergingParallelGatewayArray(allElements){
    for(var i=0; i<allElements.length; i++){
        if((allElements[i].businessObject.$type.indexOf('ParallelGateway') != -1  || allElements[i].businessObject.$type.indexOf('InclusiveGateway') != -1) && allElements[i].businessObject.gatewayDirection.indexOf('Converging') != -1){
            //buldugumuz converging paralel icin arrayimize butun incominglerini atiyacagiz
            for(var k=0; k<allElements[i].businessObject.get('incoming').length;k++){
                //daha onceki degerlerden aynisi var mi kontrol edelim. ancak yoksa ekleyeylim. 
                var isThereDuplicate=false;
                for(var l=0; l<andGatewaysMerged.length;l++){
                    if(andGatewaysMerged[l].convAnd ==allElements[i].businessObject.id && 
                      andGatewaysMerged[l].incSeqFlowId ==allElements[i].businessObject.get('incoming')[k].id)
                        isThereDuplicate=true;
                }
                if(isThereDuplicate==false){
                    andGatewaysMerged.push({
                        convAnd: allElements[i].businessObject.id,
                        incSeqFlowId: allElements[i].businessObject.get('incoming')[k].id,
                        didFlowMerge: false
                    });
                }
            }
        }
    }
}

//Initiate the animation by finding start events and then triggering recursion----
//--------------------------------------------------------------------------------
function markSeqInOrder(){
    elementRegistry = viewer.get('elementRegistry');
    //find all start events and mark them to let user select one
    var index = 0;//tek sayilardaki start eventleri push etmiycez
    //cunku shape ve label icin ayri ayri push ediyor. 
    var elements = elementRegistry.filter(function(element) {
      if(is(element, 'bpmn:StartEvent')){
          index++;
          if(index % 2 == 0){//sadece ilk shapei ekleyecegiz
              var startEventShape = elementRegistry.get(element.id);
              var strtEventToParse = startEventShape.businessObject;//Base 
              startEvents.push(strtEventToParse);
          }
      }
    });
    console.log('seq flow bulduk mu');
    console.log(startEvents[0].get('outgoing')[0]);
    findGatewayCouples(startEvents[0].get('outgoing')[0]);
    console.log('couple andleri bulduk mu');
    console.log(gatewayCombination);
    //var startEvent = startEvents[0];
    if(startEvents.length == 1){//eger bir tane start event varsa animasyona baslayip normal sekilde devam ediyoruz
        markObjectAndSeqFlow(startEvents[0].id, 'highlight', 'lime');
        var currShape = elementRegistry.get(startEvents[0].id);
        var currShapeType = currShape.type;//bpmn:StartEvent
        var objToParse = currShape.businessObject;//Base 
        if(objToParse.get('outgoing')[0] === undefined)
            return;
        var seqFlow = objToParse.get('outgoing');
        var pathNum = seqFlow.length;
        if(pathNum == 1){
            findNextObject(seqFlow[0]);
        }
    }else{//birden fazla start event varsa kullanicinin birini secmesi gerekecek.
        isMultipleStartEvents = true;
        for(var i=0; i< startEvents.length;i++){
            //kullanicinin secmesi gerekenleri isaretliyoruz
            markObject(startEvents[i].id, 'highlight-toselect');
        }
    }
}

//Recursive animation basically doing all the stuff for both stepwise and regular----
//-----------------------------------------------------------------------------------
function findNextObject(seqFlowToParse){
    var nextObject = seqFlowToParse.targetRef;
    var nextObjectType = nextObject.$type;
    console.log('sorun burdan sonra mi oluyor');
    if(nextObjectType.indexOf('EndEvent') != -1){
        loopCount+=2;
        markObject(nextObject.id, 'highlight');
        loopCount+=10;
        numOfRepeats++;
        logExp("endEventPrc1Anim "+numOfRepeats, particId);
        //logExp(particId+" endEventPrc1Anim "+numOfRepeats, "WebLogger");
        //Alert user that the animation will start again.
        //Removed for Experiment 2
        //doSetTimeoutEndAlert(timerCoef*(loopCount+1));
        loopCount+=1;
        //resetAll();
        //Below four lines removed for Experiment 2
        //var tempLoopCount = loopCount;
        //doSetTimeoutResetandInitiate(timerCoef*(tempLoopCount));
        //Butona basildigi zaman ile ayni is yapiliyor. 
        //loopCount = tempLoopCount;
    }
    else if(nextObjectType.indexOf('Task') != -1 || nextObjectType.indexOf('Event') != -1
           || nextObjectType.indexOf('SubProcess') != -1){
        var seqFlow = nextObject.get('outgoing');
        //identify if role based selected, in current lane
        isCurObjInSelectedLane = false;
        if(lanes.length >0){
            var curLaneId = nextObject.lanes[0].id;
        }
        if(isRoleBasedAnimSelected == true && roleIdtobeAnimated.indexOf(curLaneId) != -1){
            isCurObjInSelectedLane = true;
        }
        
        if(isStepAnimSelected == true){
            markCleanObject(nextObject.id, 'highlight');
            markCleanObject(nextObject.id, 'highlight-light');
            loopCount++;
            markObject(nextObject.id, 'highlight-light');
            loopCount++;
            isJustFollowNext=true;
            nodetobeClicked.push(nextObject.id);
            return;
        }
        console.log('role secildi mi? ' + isRoleBasedAnimSelected);
        //check if role filtering is active
        if(isRoleBasedAnimSelected == false || (isRoleBasedAnimSelected == true && isCurObjInSelectedLane == true)){
            markCleanObject(nextObject.id, 'highlight');
            markObjectAndSeqFlow(nextObject.id, 'highlight', 'lime');
            loopCount++;
            isCurObjInSelectedLane = false;
            findNextObject(seqFlow[0]);
        }else{//if role based anim selected but the object is not in the selected lane
            //markCleanObject(nextObject.id, 'highlight');
            //markObjectAndSeqFlow(nextObject.id, 'highlight', 'lime');
            //loopCount++;
            findNextObject(seqFlow[0]);
        }
    }else if((nextObjectType.indexOf('ExclusiveGateway') !=-1) 
             && nextObject.gatewayDirection == "Diverging"){
        var seqFlow = nextObject.get('outgoing');
        var pathNum = seqFlow.length;
        //check if role based anim is selected and if the object is in the selected lane
        isCurObjInSelectedLane = false;
        if(lanes.length >0){
            var curLaneId = nextObject.lanes[0].id;
        }
        if(isRoleBasedAnimSelected == true && roleIdtobeAnimated.indexOf(curLaneId) != -1){
            isCurObjInSelectedLane = true;
        }
        
        if(isRoleBasedAnimSelected == false || isCurObjInSelectedLane == true){
            markCleanObject(nextObject.id, 'highlight');
            loopCount++;
            markObject(nextObject.id, 'highlight');
        }
        for(var i=0; i<pathNum;i++){
            seqFlowstobeClicked.push({
                relatedXOR: nextObject.id, 
                seqFlowId: seqFlow[i].id});
            if(isRandomFlowSelected == false && ((isRoleBasedAnimSelected == false) || (isRoleBasedAnimSelected == true && isCurObjInSelectedLane == true))){
                loopCount++;
                markSeqFlowwithGivenId(seqFlow[i].id, 'Magenta');
            }
        }
        console.log('hangilere tiklamak lazim: ');
        console.log(seqFlowstobeClicked);
        
        if(isRandomFlowSelected == true || (isRoleBasedAnimSelected == true && isCurObjInSelectedLane == false)){//if obj in another lane, assign selection randomly
            var randomSelectedPath = Math.floor((Math.random() * pathNum)+1)-1;
            console.log("rasgele sayimiz. maks: " + pathNum + " gerceklesen " +randomSelectedPath);
            //findNextObject(seqFlow[(randomSelectedPath)]);
            //TODO: Check this following conditions. Can be wrong.
            if(isRandomFlowSelected == true || (isRoleBasedAnimSelected == false || (isRoleBasedAnimSelected == true && isCurObjInSelectedLane == true))){
                markSeqFlowwithGivenId(seqFlow[randomSelectedPath].id, 'Magenta');
                loopCount++;
                markSeqFlowwithGivenId(seqFlow[randomSelectedPath].id, 'lime');
            }
            var shape1 = elementRegistry.get(seqFlow[randomSelectedPath].id);
            eventBus.fire('element.click', { element: shape1 });
        }
        return;
        
    }else if((nextObjectType.indexOf('ExclusiveGateway') !=-1) && nextObject.gatewayDirection == "Converging"){
        //check if role based anim is selected and if the object is in the selected lane
        isCurObjInSelectedLane = false;
        if(lanes.length >0){
            var curLaneId = nextObject.lanes[0].id;
        }
        if(isRoleBasedAnimSelected == true && roleIdtobeAnimated.indexOf(curLaneId) != -1){
            isCurObjInSelectedLane = true;
        }
        //We remove the following part so that in stepAnim, it automatically flows through converging XOR. There is no need for the user to select the gateway. If we prefer it to be clicked by the user as well, we need to enable this. 
        /*if(isStepAnimSelected == true){
            markCleanObject(nextObject.id, 'highlight');
            loopCount++;
            markObject(nextObject.id, 'highlight-light');
            isJustFollowNext=true;
            nodetobeClicked.push(nextObject.id);
            return;
        }*/
        //Specific to Exp2 ProcessD-Similar. If XOR before D, E and G is traversed twice, set the parameter. 
        if(nextObject.id.indexOf('sid-3A5661A0-3267-4EDC-B98F-EDD80290D10E') != -1 && processName.indexOf('ProcessD-Similar') != -1){
            numofPrcDTaskDEnabled++;
        }else if(nextObject.id.indexOf('sid-940B7FE8-962D-4925-9872-FC566EB65609') != -1 && processName.indexOf('ProcessD-Similar') != -1){
            numofPrcDTaskEEnabled++;//convergin XOR before E
        }else if(nextObject.id.indexOf('sid-E2AC263C-7EDB-47BE-BC88-86E7C484A833') != -1 && processName.indexOf('ProcessD-Similar') != -1){
            numofPrcDTaskGEnabled++;
        }else if(nextObject.id.indexOf('sid-F0C72DE7-CF23-4695-B219-61A477D9145D') != -1 && processName.indexOf('ProcessD-Similar') != -1){
            numofPrcDLowerANDHEnabled++;     //Conv XOR before H is enabled
        }
        //Specific to Exp2 TwoLevel-Mismatch. If XOR before D is traversed twice, set the parameter
        else if(nextObject.id.indexOf('sid-ACF5969B-0BF1-4602-BFE9-9F91FE5AC2F4') != -1 && processName.indexOf('TwoLevel-Mismatch') != -1){
            numofPrcTLMTaskFEnabled++;     //Conv XOR before F is enabled
        }
        
        if(isRoleBasedAnimSelected == false || isCurObjInSelectedLane == true){
            markCleanObject(nextObject.id, 'highlight');
            markObjectAndSeqFlow(nextObject.id, 'highlight', 'lime');
            isCurObjInSelectedLane = false;
        }
        var seqFlow = nextObject.get('outgoing');
        findNextObject(seqFlow[0]);
    }
    else if((nextObjectType.indexOf('ParallelGateway') !=-1  || nextObjectType.indexOf('InclusiveGateway') !=-1) 
             && nextObject.gatewayDirection == "Converging"){
        //Only for Exp2 ProcessD-Similar. Before H, we will check the number of visits to upper and lower seq flows. 
        if(nextObject.id.indexOf('sid-C9870141-F3CA-413D-BFE3-DDB21B3D6362') != -1 && processName.indexOf('ProcessD-Similar') != -1){
            //if we have reached the correct AND, let's see the seq flows
            var isFlowAfterANDEnabled = false;
            if(numofPrcDLowerANDHEnabled >0 && numofPrcDUpperANDHEnabled >0){
                //the flow can continue to next.
                markCleanObject(nextObject.id, 'highlight');
                loopCount++;
                markObject(nextObject.id, 'highlight');
                isFlowAfterANDEnabled = true;
                numofPrcDLowerANDHEnabled--;
                numofPrcDUpperANDHEnabled--;
                numofPrcDANDHEnabled++; 
                numofPrcDTaskHEnabled++;
            }
            //Before we continue, mark the seq flow with missing exec 
            var upperSeqFlowID = 'sid-DF2D6D3F-A69F-4B84-BE6C-398950E96C14';
            var lowerSeqFlowID = 'sid-EF7A2AAF-7EE6-4904-9523-4890F4928EE4';
            if((numofPrcDLowerANDHEnabled > numofPrcDUpperANDHEnabled) && numofPrcDANDHEnabled > 0){
                markSeqFlowwithGivenId(upperSeqFlowID, 'black');
            }else if((numofPrcDUpperANDHEnabled > numofPrcDLowerANDHEnabled) && numofPrcDANDHEnabled > 0){
                markSeqFlowwithGivenId(lowerSeqFlowID, 'black');
            }//if they are both 0, don't do anything. 
            
            //continue with routine flow to the next item
            if(isFlowAfterANDEnabled == true){
                var seqFlow = nextObject.get('outgoing');
                var pathNum = seqFlow.length;
                for(var i=0; i<pathNum;i++){
                    if(isRoleBasedAnimSelected == false || isCurObjInSelectedLane == true){
                        loopCount++;
                        markSeqFlowwithGivenId(seqFlow[i].id, 'lime');
                    }
                    findNextObject(seqFlow[i]);
                }
            }
            return; //return so that regular stuff is not executed specific to this AND.
        }//for Exp2 PrcTL. When it comes to converging OR, wait for M or N. 
        else if(nextObject.id.indexOf('sid-B9FCF1BF-2060-48F4-8667-E6BB8B0C2870') != -1 && processName.indexOf('ThreeLevel') != -1){
            if(prcTLTaskMExecuted == true && prcTLTaskNExecuted == true){
                //we want it to continue like regular conv AND. Do nothing special, just continue. Only remove from the node to be clicked so that it can continue. 
                for(var n=0; n<nodetobeClicked.length;n++){
                    if(nodetobeClicked[n].indexOf(nextObject.id) != -1){ 
                        nodetobeClicked.splice(n, 1);
                    }
                }
                isJustFollowNext=false;
                prcTLTaskMExecuted = false;
                prcTLTaskNExecuted = false;
            }else{
                markCleanObject(nextObject.id, 'highlight');
                loopCount++;
                markObject(nextObject.id, 'highlight-light');
                isJustFollowNext=true;
                nodetobeClicked.push(nextObject.id);
            }
        }
        //for Exp2 PrcL-Similar. When it comes to first converging OR, wait for A or B. 
        else if(nextObject.id.indexOf('sid-D4CD6B85-92DA-45F6-BCCB-F9289102B5AA') != -1 && processName.indexOf('ProcessL-Similar') != -1){
            if(prcLTaskAExecuted == true && prcLTaskBExecuted == true){
                //we want it to continue like regular conv AND. Do nothing special, just continue. Only remove from the node to be clicked so that it can continue. 
                for(var n=0; n<nodetobeClicked.length;n++){
                    if(nodetobeClicked[n].indexOf(nextObject.id) != -1){ 
                        nodetobeClicked.splice(n, 1);
                    }
                }
                isJustFollowNext=false;
                prcLTaskAExecuted = false;
                prcLTaskBExecuted = false;
            }else{
                //then color conv OR regularly
                markCleanObject(nextObject.id, 'highlight');
                loopCount++;
                markObject(nextObject.id, 'highlight-light');
                isJustFollowNext=true;
                nodetobeClicked.push(nextObject.id);
            }
        }
        //for Exp2 PrcL-Similar. When it comes to last converging OR, behave exactly like XOR
        else if(nextObject.id.indexOf('sid-7C6432B3-1582-43C3-AB0B-2E8C25312353') != -1 && processName.indexOf('ProcessL-Similar') != -1){
            markCleanObject(nextObject.id, 'highlight');
            markObjectAndSeqFlow(nextObject.id, 'highlight', 'lime');
            isCurObjInSelectedLane = false;
            var seqFlow = nextObject.get('outgoing');
            findNextObject(seqFlow[0]);
            //this is all the same as whan an XOR does. Then, we return so that AND behavior is not performed. 
            return;
        }
        //for Exp2 PrcTLO (TwoLevel-OR). When it comes to converging OR, wait for J, K or L. 
        else if(nextObject.id.indexOf('sid-84238CE5-A20F-4E5B-A6C8-B286CEABE731') != -1 && processName.indexOf('TwoLevel-OR') != -1){
            if(prcTLOTaskJExecuted == true && prcTLOTaskKExecuted == true && prcTLOTaskLExecuted == true){
                //we want it to continue like regular conv AND. Do nothing special, just continue. Only remove from the node to be clicked so that it can continue. 
                for(var n=0; n<nodetobeClicked.length;n++){
                    if(nodetobeClicked[n].indexOf(nextObject.id) != -1){ 
                        nodetobeClicked.splice(n, 1);
                    }
                }
                isJustFollowNext=false;
                prcTLOTaskJExecuted = false;
                prcTLOTaskKExecuted = false;
                prcTLOTaskLExecuted = false;
            }else{
                markCleanObject(nextObject.id, 'highlight');
                loopCount++;
                markObject(nextObject.id, 'highlight-light');
                isJustFollowNext=true;
                
                var isInnerConvORInNodetoClickList=false;
                for(var n=0; n<nodetobeClicked.length;n++){
                    if(nodetobeClicked[n].indexOf(nextObject.id) != -1){ 
                        isInnerConvORInNodetoClickList=true;
                    }
                }
                if(isInnerConvORInNodetoClickList == false){
                    nodetobeClicked.push(nextObject.id);
                }
            }
        }
        //Prc TLO outer OR converging. When it arrives here automatically, expect F or lower path to be executed to automatically move forward. 
        else if(nextObject.id.indexOf('sid-BDF017DE-8C00-4CE1-9A3F-C254D51AF719') != -1 && processName.indexOf('TwoLevel-OR') != -1){
            if(prcTLOTaskFExecuted == true && prcTLOOuterConvORLowerSeqExecuted == true){
                //we want it to continue like regular conv AND. Do nothing special, just continue. Only remove from the node to be clicked so that it can continue. 
                for(var n=0; n<nodetobeClicked.length;n++){
                    if(nodetobeClicked[n].indexOf(nextObject.id) != -1){ 
                        nodetobeClicked.splice(n, 1);
                    }
                }
                isJustFollowNext=false;
                prcTLOTaskFExecuted = false;
                prcTLOOuterConvORLowerSeqExecuted = false;  
            }else{
                //we can't just move on. We either wait for paths to be completed, or the user to specifically click
                //but before, mark which side approached OR so that we can check the other one. 
                if(prcTLOTaskFExecuted == true){
                    prcTLOdidLowerPathReachOuterConvOr = false;
                }
                if(prcTLOOuterConvORLowerSeqExecuted == true){
                    prcTLOdidLowerPathReachOuterConvOr = true;
                }
                markCleanObject(nextObject.id, 'highlight');
                loopCount++;
                markObject(nextObject.id, 'highlight-light');
                isJustFollowNext=false;
                nodetobeClicked.push(nextObject.id);
            }
        }
        
        ////////End of Exp2 specific part
        
        //check if role based anim is selected and if the object is in the selected lane
        isCurObjInSelectedLane = false;
        if(lanes.length >0){
            var curLaneId = nextObject.lanes[0].id;
        }
        if(isRoleBasedAnimSelected == true && roleIdtobeAnimated.indexOf(curLaneId) != -1){
            isCurObjInSelectedLane = true;
        }
        
        //Bu convergingde devam etmeden once tum kollardan akislarin geldiginden emin olmaliyiz
        for(var i=0; i<andGatewaysMerged.length;i++){
            //seq flow to parse'i bulup isaretleyelim
            //console.log('kontrol edilen array ogesi: '+andGatewaysMerged[i].convAnd+'ve'+andGatewaysMerged[i].incSeqFlowId);
            if(andGatewaysMerged[i].convAnd== nextObject.id && andGatewaysMerged[i].incSeqFlowId== seqFlowToParse.id){
               //dogru kolu bulduk. isaretleyelim. 
                andGatewaysMerged[i].didFlowMerge = true;
               }
        }
        //tekrar tum andGatewayMerged arrayine bakip bu gateway icin hepsi isaretlenmis mi gorucez. 
        var didAllIncomingPathsPassed=true;
        for(var j=0; j<andGatewaysMerged.length;j++){
            if(andGatewaysMerged[j].convAnd == nextObject.id){
                if(andGatewaysMerged[j].didFlowMerge == false){
                    didAllIncomingPathsPassed = false;//hayir hepsi bitmemis. devam edemeyiz
                }
            }
        }
        console.log('can we find the correct flow in OR?' + didAllIncomingPathsPassed);
        if(didAllIncomingPathsPassed == true){
            //console.log('tum kollari isaretledigimiz noktaya geldik');
            //We remove the following part so that in stepAnim, it automatically flows through converging AND. There is no need for the user to select the gateway. If we prefer it to be clicked by the user as well, we need to enable this. 
            /*if(isStepAnimSelected == true){
                markCleanObject(nextObject.id, 'highlight');
                loopCount++;
                markObject(nextObject.id, 'highlight-light');
                isJustFollowNext=true;
                nodetobeClicked.push(nextObject.id);
                return;
            }*/
            if(isRoleBasedAnimSelected == false || isCurObjInSelectedLane == true){
                markCleanObject(nextObject.id, 'highlight');
                markCleanObject(nextObject.id, 'highlight-light');
                loopCount++;
                markObject(nextObject.id, 'highlight');
            }
            var seqFlow = nextObject.get('outgoing');
            var pathNum = seqFlow.length;
            for(var i=0; i<pathNum;i++){
                if(isRoleBasedAnimSelected == false || isCurObjInSelectedLane == true){
                    loopCount++;
                    markSeqFlowwithGivenId(seqFlow[i].id, 'lime');
                }
                findNextObject(seqFlow[i]);
            }
        }
        isCurObjInSelectedLane = false;
    }
    else if((nextObjectType.indexOf('ParallelGateway') !=-1 || nextObjectType.indexOf('InclusiveGateway') !=-1)
            && nextObject.gatewayDirection == "Diverging"){
        
        //check if role based anim is selected and if the object is in the selected lane
        isCurObjInSelectedLane = false;
        if(lanes.length >0){
            var curLaneId = nextObject.lanes[0].id;
        }
        if(isRoleBasedAnimSelected == true && roleIdtobeAnimated.indexOf(curLaneId) != -1){
            isCurObjInSelectedLane = true;
        }
        
        //Paralel kola devam etmeden once bu fragmentin isaretleme bilgisini sifirlamamiz gerekiyor
        //Normal akista bu gerekmiyor ama kullanici XOR secip geriye donduyse tekrar boyama icin
        //Bu bilgileri resetlememiz gerekiyor
        var convAndId = findConvAndofGivenDivAnd(nextObject.id);//buna karsilik gelen converging ne
        //console.log('gercekten fragment bilgisini alabildik mi? Divergin: '+nextObject.id+'converging: '+convAndId);
        //Bu converging icin andGatewaysMerged bilgisini (tum inc seq flowlar icin) sifirliycaz
        for(var m=0; m < andGatewaysMerged.length; m++){
            if(andGatewaysMerged[m].convAnd.indexOf(convAndId) != -1){
                andGatewaysMerged[m].didFlowMerge = false;
            }
        }
        if(isRoleBasedAnimSelected == false || isCurObjInSelectedLane == true){
            markCleanObject(nextObject.id, 'highlight');
            loopCount++;
            markObject(nextObject.id, 'highlight');
        }
        var seqFlow = nextObject.get('outgoing');
        var pathNum = seqFlow.length;
        if(isRoleBasedAnimSelected == false || isCurObjInSelectedLane == true){
            for(var i=0; i<pathNum;i++){
                markSeqFlowwithGivenId(seqFlow[i].id, 'Lime');
                //paralel kollari hemen ayni anda boyamak istiyoruz ki paralel mantigi anlayalim.
                //next object bularak sonrasindaki loopta devam edicez. 
                //Ilk objeleri de hemen boyamak istersen bunu ac
                //markObject(seqFlow[i].targetRef.id, 'highlight');
            }
        }
        isCurObjInSelectedLane = false;
        for(var k=0; k<pathNum;k++){
            findNextObject(seqFlow[k]);
        }
        //loopCount++;
    }
}

//----
//----------------------------------------------------------------------------
function highlightFrgsRecursive(tree){
    //loop through tree 
    //go through the fragment children as a loop
    console.log('treeye bakiyoruz');
    console.log(tree);
    console.log(tree.children.length);
    var length = tree.children.length;
    var i = 0;
    for(;i<length;i++){
        console.log('donguye girdi');
        console.log(tree.children[i]);
        if(tree.children[i].data.frgType == "ACT"){
            /*if(isPathSelected==true){
                if(tree.children[i].data.curPathNum == selectedSeqFlowPathNum){
                    var actID = tree.children[i].data.strtID;
                    loopCount++;
                    markObjectAndSeqFlow(actID);
                }
            }else{*/
                var actID = tree.children[i].data.strtID;
                //loopCount++;
                markObjectAndSeqFlow(actID, 'highlight', 'lime');
        }//else if(tree.children[i].data.frgType == "XOR"){
            //gatewayi renklendir. Sonra kollarina bak. Kollarda aktivite oldugu surece renklendir. Fragment gelirse recurse et
            /*loopCount++;
            markObject(tree.children[i].data.strtID);
            //totalpathnumu kacsa o kollari basicaz
            loopCount++;
            //burada kullanicidan bir tane kolu tiklamasini bekliyoruz*/
            
            /*var seqFlowstobeClicked=[];
            var selectedElementId;
            var j=0;
            for(j=0;j<tree.children[i].data.totalPathNum;j++){
                //markSeqFlow(tree.children[i].data.strtID, j);
                //geldigimiz XORun olasi her kolu icin listener yaratiyoruz
                var thisSeqFlowId=getSeqFlowId(tree.children[i].data.strtID, j);
                console.log('baktigimiz flowun idsi: '+j+' '+thisSeqFlowId);
                //seqFlowstobeClicked[j]=thisSeqFlowId;
                seqFlowstobeClicked[j]= document.querySelector('#canvas [data-element-id = '+thisSeqFlowId+']');
                seqFlowstobeClicked[j].addEventListener('click', function(e) {
                    alert('clicked the path! ');
                    console.log('bastigimiz zaman gelen nane');
                    console.log(e);
                    selectedElementId = e.element.id;
                });
            }*/

            //Kollara ozel listener eklemeden once genel event bus ile boyle cozum yapmistim 
            /*events.forEach(function(event) {
                eventBus.on(event, function(e) {
                // e.element = the model element
                // e.gfx = the graphical element
                if(event=='element.click'){
                    for(var k=0;k<seqFlowstobeClicked.length;k++){
                        if(e.element.id == seqFlowstobeClicked[k])
                            selectedElementId = seqFlowstobeClicked[k];
                            isPathSelected = true;
                            selectedSeqFlowPathNum = k;
                    }
                }
                    //log(event, 'on', e.element.id);
                 });
            });*/
            
            /*waitForIt(seqFlowstobeClicked, createEventBus);
            return;
            console.log('tiklanan kolun idsi: '+selectedElementId);
            if(isPathSelected == true){
                console.log(selectedElementId);
                markSeqFlowwithGivenId(selectedElementId);
                isPathSelected=false;
                markObjectAndSeqFlow(tree.children[i].data.endID);
            }*/
            //alt asamalari da aynen renklendirecek
            //highlightFrgsRecursive(tree.children[i]);
            //gatewayi renklendir. Sonra kollarina bak. Kollarda aktivite oldugu surece renklendir. Fragment gelirse recurse et
            /*startEventNode = document.querySelector('#canvas [data-element-id = '+startEventID+']');
            startEventNode.addEventListener('click', function(e) {
                  //alert('clicked the end event!');
                myfunction(tree);
                });*/
            //loopCount++;
            //markObject(tree.children[i].data.strtID);
            //totalpathnumu kacsa o kollari basicaz
            //loopCount++;
            /*var j=0;
            for(;j<tree.children[i].data.totalPathNum;j++){
                markSeqFlow(tree.children[i].data.strtID, j);
            }*/
            //alt asamalari da aynen renklendirecek
            //highlightFrgsRecursive(tree.children[i]);
            //markObjectAndSeqFlow(tree.children[i].data.endID);
        //}
        else if(tree.children[i].data.frgType == "AND" || tree.children[i].data.frgType == "XOR"){
            //gatewayi renklendir. Sonra kollarina bak. Kollarda aktivite oldugu surece renklendir. Fragment gelirse recurse et
            loopCount++;
            markObject(tree.children[i].data.strtID, 'highlight', 'lime');
            //totalpathnumu kacsa o kollari basicaz
            loopCount++;
            var j=0;
            for(;j<tree.children[i].data.totalPathNum;j++){
                markSeqFlow(tree.children[i].data.strtID, j, 'lime');
            }
            //alt asamalari da aynen renklendirecek
            highlightFrgsRecursive(tree.children[i]);
            markObjectAndSeqFlow(tree.children[i].data.endID, 'highlight', 'lime');
        }
    }
}

function markObjectAndSeqFlow(actID, colorO, colorS){
    loopCount++;
    var loopF = timerCoef*(loopCount+1);
    doSetTimeoutObj(actID, loopF, colorO);
    var currShape = elementRegistry.get(actID);
    var currShapeType = currShape.type;//bpmn:StartEvent
    var currObject = currShape.businessObject;//Base 
    var seqFlow = currObject.get('outgoing');
    if(seqFlow[0] !== undefined){
        loopCount++;
        loopF = timerCoef*(loopCount+1);
        doSetTimeoutFlow(seqFlow[0], loopF, colorS);
    }
}

function markObject(objID, color){
    var loopF = timerCoef*(loopCount+1);
    doSetTimeoutObj(objID, loopF, color);
}

function markCleanObject(objID, color){
    var loopF = timerCoef*(loopCount+1);
    doSetTimeoutCleanObj(objID, loopF, color);
}

function markSeqFlow(objID, seqFlowOrder, color){
    var loopF = timerCoef*(loopCount+1);
    var currShape = elementRegistry.get(objID);
    var currShapeType = currShape.type;//bpmn:StartEvent
    var currObject = currShape.businessObject;//Base 
    var seqFlow = currObject.get('outgoing');
    if(seqFlow[seqFlowOrder] !== undefined){
        loopF = timerCoef*(loopCount+1);
        doSetTimeoutFlow(seqFlow[seqFlowOrder], loopF, color);
    }
}
function markSeqFlowwithGivenId(seqID, color){
    var loopF = timerCoef*(loopCount+1);
    var currSeq = elementRegistry.get(seqID);
    var currObject = currSeq.businessObject;//Base 
    doSetTimeoutFlow(currObject, loopF, color);
}
function getSeqFlowId(objID, seqFlowOrder){
    var currShape = elementRegistry.get(objID);
    var currShapeType = currShape.type;//bpmn:StartEvent
    var currObject = currShape.businessObject;//Base 
    var seqFlow = currObject.get('outgoing');
    if(seqFlow[seqFlowOrder] !== undefined){
        return seqFlow[seqFlowOrder].id;
    }
}

function checkSelectedSeq(){
    /*if(isPathSelectionPointArrived == true){
        //hem klik geldi. hem de yeni kontrol noktasi geldi. dogru yer basilmis mi bak
        for(var k=0;k<seqFlowstobeClicked.length;k++){
            if(selectedElementId == seqFlowstobeClicked[k]){
                selectedElementId = seqFlowstobeClicked[k];
                isPathSelected = true;
                selectedSeqFlowPathNum = k;
            }
        }
        if(isPathSelected == true){
            markSeqFlowwithGivenId(selectedElementId);
        }
    }*/
    console.log('tikladigim kolun idsi: '+selectedElementId);
    //markSeqFlowwithGivenId(selectedElementId);
    var outgoingGfx = viewer.get('elementRegistry').getGraphics(selectedElementId);
    outgoingGfx.select('path').attr({stroke: 'lime'});
}

//Parse all objects and make an array of matching gateway couples
//For the moment just works for AND gateways
function findGatewayCouples(seqFlowToParse){
    var nextObject = seqFlowToParse.targetRef;
    var nextObjectType = nextObject.$type;
    
    for(var k = 0; k <allObjects.length; k++){
        if(allObjects[k].id == nextObject.id && allObjects[k].isPassed == true){ 
            return;
        }
    }
    allObjects.push({
    id: nextObject.id,
    isPassed: true
    });
    
    if(nextObjectType.indexOf('endEvent') != -1){
        return;
    }
    if((nextObjectType.indexOf('ParallelGateway') !=-1  || nextObjectType.indexOf('InclusiveGateway') !=-1)
            && (nextObject.gatewayDirection == "Diverging")){
        console.log('geldik mi diverginge');
        console.log(nextObject);
        gatewayCombination.push({
            divGatewayID: nextObject.id,
            convGatewayID: 0
        });
        var seqFlow = nextObject.get('outgoing');
        for(var j = 0; j < seqFlow.length; j++){
            findGatewayCouples(seqFlow[j]);
        }
        
    }else if((nextObjectType.indexOf('ParallelGateway') !=-1  || nextObjectType.indexOf('InclusiveGateway') !=-1)
            && (nextObject.gatewayDirection == "Converging")){
        //gatewayi sondan donup en son convergenti bos olana ata
        for(var i = gatewayCombination.length - 1; i >= 0; i--){
            if(gatewayCombination[i].convGatewayID == 0){
                gatewayCombination[i].convGatewayID = nextObject.id;
            }
        }
        var seqFlow = nextObject.get('outgoing');
        findGatewayCouples(seqFlow[0]);
    }else{
        var seqFlow = nextObject.get('outgoing');
        for(var j = 0; j < seqFlow.length; j++){
            findGatewayCouples(seqFlow[j]);
        }
    }
}


function findConvAndofGivenDivAnd(divAndID){
    //bir diverginge geldigimizde onun bagli oldugu convergingi don
    for(var i = 0; i < gatewayCombination.length; i++){
        if(gatewayCombination[i].divGatewayID == divAndID){
            return gatewayCombination[i].convGatewayID;
        }
    }
}

//Add timer to check how long the user checks the model---------
//--------------------------------------------------------------
var inSeconds; 
$(function() {
        var cd = $('#countdown');
        var a = (cd.text()).split(':');
        inSeconds = a[0]*60 + a[1]*1;
        var interv = setInterval(function() {
            inSeconds --;
            var minute = Math.floor((inSeconds) / 60);
            var seconds = inSeconds - (minute * 60);
            if(seconds < 10){
                seconds = '0'+seconds;
            }
            var c = minute + ':' + seconds;
            cd.html(c);
            if (inSeconds == 0) {
                //window.location.reload(false);
                clearInterval(interv);
            }
        }, 1000);
    });

//Prevent going back in the page. --------------------------------
//-----------------------------------------------------------------
/*(function ($, global) {

    var _hash = "!",
    noBackPlease = function () {
        global.location.href += "#";

        setTimeout(function () {
            global.location.href += "!";
        }, 50);
    };

    global.setInterval(function () {
        if (global.location.hash != _hash) {
            global.location.hash = _hash;
        }
    }, 100);

    global.onload = function () {
        noBackPlease();

        // disables backspace on page except on input fields and textarea..
        $(document.body).keydown(function (e) {
            var elm = e.target.nodeName.toLowerCase();
            if (e.which == 8 && elm !== 'input' && elm  !== 'textarea') {
                e.preventDefault();
            }
            // stopping event bubbling up the DOM tree..
            e.stopPropagation();
        });
    }

})(jQuery, window);*/