////////////////////////////////////////////////////////////////////////////////
// 1) Global Variables & Helper Functions
////////////////////////////////////////////////////////////////////////////////

const charityMapping = {
  "Meningitis": "https://www.meningitis.org/",
  "Alzheimer's Disease and Other Dementias": "https://www.alzint.org/",
  "Parkinson's Disease": "https://www.michaeljfox.org/",
  "Nutritional Deficiencies": "https://www.nutritionintl.org/",
  "Malaria": "https://www.againstmalaria.com/",
  "Drowning": "https://www.ilsf.org/",
  "Interpersonal Violence": "https://cvg.org/",
  "Maternal Disorders": "https://www.whiteribbonalliance.org/",
  "HIV": "https://www.aidshealth.org/",
  "Drugs Use Disorders": "https://hri.global/",
  "Tuberculosis": "https://www.stoptb.org/",
  "Cardiovascular Diseases": "https://world-heart-federation.org/",
  "Respiratory Infections": "https://www.gavi.org/",
  "Neonatal Disorders": "https://www.savethechildren.org/",
  "Alcohol Use Disorders": "https://movendi.ngo/",
  "Nature": "https://www.ifrc.org/",
  "Diarrheal Diseases": "https://www.wateraid.org/",
  "Environmental Heat and Cold Exposure": "https://www.habitat.org/",
  "Neoplasms": "https://www.uicc.org/",
  "Terrorism": "https://www.icrc.org/",
  "Diabetes Mellitus": "https://idf.org/",
  "Nephropathy": "https://www.ifkf.org/",
  "Poisonings": "https://www.safekids.org/",
  "Malnutrition": "https://www.actionagainsthunger.org/",
  "Road Injuries": "https://www.fiafoundation.org/",
  "Respiratory": "https://www.lung.org/",
  "Cirrhosis": "https://liverfoundation.org/",
  "Digestive Diseases": "https://www.worldgastroenterology.org/",
  "Fire, Heat, and Hot Substances": "https://interburns.org/",
  "Hepatitis": "https://www.worldhepatitisalliance.org/"
};


function getShortLabel(cause) {
  return cause.split(/[ ,]+/)[0].replace(/[^\w]/g, '');
}


function typeWriter(text, element, delay = 100, callback = null) {
  if (element.getAttribute("data-typing") === "true") return;
  element.setAttribute("data-typing", "true");

  element.innerHTML = "";
  let i = 0;
  const interval = setInterval(() => {
    element.innerHTML += text.charAt(i);
    i++;
    if (i >= text.length) {
      clearInterval(interval);
      element.removeAttribute("data-typing");
      if (callback) callback();
    }
  }, delay);
}

/**
 * Basic function to fetch a poem via your backend route
 */
async function fetchPoem(country, cause, deaths, year) {
  d3.select("#poem-panel").text("Fetching poem...").style("opacity", 1);
  try {
    const response = await fetch("/api/poem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, cause, deaths, year })
    });
    const data = await response.json();
    if (data && data.poem) {
      d3.select("#poem-panel").html(data.poem);
    } else {
      d3.select("#poem-panel").html("No poem generated.");
    }
  } catch (error) {
    console.error("Error fetching poem:", error);
    d3.select("#poem-panel").html("An error occurred while generating the poem.");
  }
}

////////////////////////////////////////////////////////////////////////////////
// 2) "What's Killing Us?" (map) code
////////////////////////////////////////////////////////////////////////////////
const width = 1500, height = 900;
const svg = d3.select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoMercator()
  .translate([width / 2, height / 1.5])
  .scale(200);

const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

let allData = [];

Promise.all([
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  d3.csv("cause_of_deaths.csv")
]).then(([world, data]) => {
  data.forEach(d => {
    d.Year = +d.Year;
    for (let key in d) {
      if (key !== "Country/Territory" && key !== "Code" && key !== "Year") {
        d[key] = +d[key];
      }
    }
  });
  allData = data;

  const allColumns = data.columns;
  const causeColumns = allColumns.filter(c => !["Country/Territory","Code","Year"].includes(c));

  const dropdown = d3.select("#causeSelect");
  dropdown.selectAll("option")
    .data(causeColumns)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  svg.append("g")
    .selectAll("path")
    .data(world.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#ccc")
    .attr("stroke", "#333");

  function updateBubbles(selectedCause, selectedYear) {
    const yearData = allData.filter(d => d.Year === selectedYear);
    const maxValue = d3.max(yearData, d => d[selectedCause]);
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxValue])
      .range([0, 60]);

    const bubbles = svg.selectAll(".bubble").data(yearData, d => d.Code);
    bubbles.exit().remove();

    const bubblesEnter = bubbles.enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", d => {
        const feature = world.features.find(f =>
          f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code)
        );
        return feature ? path.centroid(feature)[0] : -100;
      })
      .attr("cy", d => {
        const feature = world.features.find(f =>
          f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code)
        );
        return feature ? path.centroid(feature)[1] : -100;
      })
      .attr("r", d => radiusScale(d[selectedCause]))
      .attr("fill", "rgba(70,70,70,0.7)")
      .attr("stroke", "#fff");

    bubblesEnter.merge(bubbles)
      .on("mouseover", (event, d) => {
        d3.select(event.target).attr("stroke","black");
        tooltip.transition().duration(200).style("opacity",0.9);
        tooltip.html(`
          <strong>${d["Country/Territory"]}</strong><br>
          ${selectedCause}: ${d[selectedCause]}<br>
          Year: ${d.Year}
        `)
        .style("left",(event.pageX+5)+"px")
        .style("top",(event.pageY-28)+"px");
      })
      .on("mouseout", (event) => {
        d3.select(event.target).attr("stroke","#fff");
        tooltip.transition().duration(500).style("opacity",0);
      })
      .on("click", (event, d) => {
        const currentCause = d3.select("#causeSelect").property("value");
        const country = d["Country/Territory"];
        const deaths = d[currentCause];
        const year = d.Year;
        fetchPoem(country, currentCause, deaths, year);
      })
      .transition()
      .duration(750)
      .attr("r", d => radiusScale(d[selectedCause]))
      .attr("cx", d => {
        const feature = world.features.find(f =>
          f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code)
        );
        return feature ? path.centroid(feature)[0] : -100;
      })
      .attr("cy", d => {
        const feature = world.features.find(f =>
          f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code)
        );
        return feature ? path.centroid(feature)[1] : -100;
      });
  }

  const initialYear = +d3.select("#yearSlider").property("value");
  updateBubbles(causeColumns[0], initialYear);

  dropdown.on("change", (event) => {
    const selectedCause = event.target.value;
    const selectedYear = +d3.select("#yearSlider").property("value");
    updateBubbles(selectedCause, selectedYear);
  });

  d3.select("#yearSlider").on("input", function() {
    const selectedYear = +this.value;
    d3.select("#yearLabel").text(selectedYear);
    const selectedCause = d3.select("#causeSelect").property("value");
    updateBubbles(selectedCause, selectedYear);
  });
}).catch(err => console.error("Error loading data: ",err));


////////////////////////////////////////////////////////////////////////////////
// 5) Page Transitions & Typewriter
////////////////////////////////////////////////////////////////////////////////
window.addEventListener("load", () => {
  const titleEl = document.getElementById("intro-title");
  const textEl  = document.getElementById("intro-text");
  typeWriter("A Shadow of Numbers.", titleEl, 100, () => {
    const para = "That's just it - in a world measured by data, we wander through statistics that tell a tale of lives lost and hopes deferred. Here, in these numbers, lies not only a record of death but a mirror to our collective struggles and triumphs. Each figure is a story. Each statistic, a heartbeat. As you journey through these pages, ask yourself: what’s killing us?";
    typeWriter(para, textEl, 50);
  });
});

document.getElementById('enter-btn').addEventListener('click', () => {
  const intro = document.getElementById('intro');
  const mainContent = document.getElementById('main-content');
  intro.style.opacity = 0;
  setTimeout(() => {
    intro.style.display='none';
    mainContent.style.display='block';
    mainContent.style.opacity=0;
    setTimeout(()=>{ mainContent.style.opacity=1; },50);
  }, 1000);
});

document.getElementById('had-enough-btn').addEventListener('click', () => {
  const mainContent = document.getElementById('main-content');
  mainContent.style.opacity=0;
  setTimeout(()=>{
    mainContent.style.display='none';
    const finalPage = document.getElementById('final-page');
    let container = document.getElementById('final-page-container');
    if(!container){
      container = document.createElement('div');
      container.id='final-page-container';
      container.style.width="100%";
      container.style.textAlign="center";
      finalPage.appendChild(container);
    }
    finalPage.style.display='flex';
    finalPage.style.opacity=0;
    setTimeout(()=>{
      finalPage.style.opacity=1;
      typeWriter("Not feeling happy?", container,100,()=>{
        setTimeout(()=>{
          finalPage.style.opacity=0;
          setTimeout(()=>{
            finalPage.style.display='none';
            finalPage.style.opacity=1;
            document.body.className="bg-happiness";
            const dash = document.getElementById('happiness-dashboard');
            dash.style.display='block';
            dash.style.opacity=0;
            const dashHeading = document.getElementById("happiness-dashboard-heading");
            dashHeading.style.display='block';
            typeWriter("You aren't alone.", dashHeading, 80, ()=>{
              const dashContent = document.getElementById("happiness-content");
              dashContent.style.display='block';
              setTimeout(()=>{ dashContent.style.opacity=1; },50);
            });
            setTimeout(()=>{ dash.style.opacity=1; },50);
            loadHappinessDashboard();
          },1000);
        },2500);
      });
    },100);
  },1000);
});

////////////////////////////////////////////////////////////////////////////////
// 6) Happiness Dashboard & Radar Chart
////////////////////////////////////////////////////////////////////////////////
const RADAR_PREDICTORS = [
  "Log GDP Per Capita",
  "Social Support",
  "Healthy Life Expectancy At Birth",
  "Freedom To Make Life Choices",
  "Generosity",
  "Perceptions Of Corruption",
  "Positive Affect",
  "Negative Affect"
];
let predictorExtents = {};

function computePredictorExtents(data) {
  RADAR_PREDICTORS.forEach(pred => {
    const vals = data.map(d => d[pred]).filter(v => !isNaN(v));
    predictorExtents[pred] = [d3.min(vals), d3.max(vals)];
  });
}
function normalizeValue(value, pred) {
  const [minVal, maxVal] = predictorExtents[pred];
  if (maxVal===minVal) return 0.5;
  return (value - minVal)/(maxVal-minVal);
}

function drawRadarChart(record, containerSelector) {
  d3.select(containerSelector).selectAll("*").remove();
  const dataArr = RADAR_PREDICTORS.map(pred=>{
    let val = record[pred];
    if(isNaN(val)) val=0;
    return { axis: pred, value: normalizeValue(val,pred) };
  });
  const width=400, height=400;
  const margin=50;
  const radius = Math.min(width,height)/2 - margin;
  const angleSlice = 2*Math.PI/RADAR_PREDICTORS.length;

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${width/2},${height/2})`);

  const levels=5;
  for(let l=0; l<levels; l++){
    const rLevel = radius*((l+1)/levels);
    g.append("circle")
     .attr("r", rLevel)
     .attr("fill","none")
     .attr("stroke","#ccc")
     .attr("stroke-dasharray","2,2");
  }

  RADAR_PREDICTORS.forEach((pred,i)=>{
    const angle = angleSlice*i -Math.PI/2;
    g.append("line")
     .attr("x1",0).attr("y1",0)
     .attr("x2", radius*Math.cos(angle))
     .attr("y2", radius*Math.sin(angle))
     .attr("stroke","#ccc");
    g.append("text")
     .attr("x",(radius+10)*Math.cos(angle))
     .attr("y",(radius+10)*Math.sin(angle))
     .attr("fill","#333")
     .attr("font-size",12)
     .attr("text-anchor","middle")
     .text(pred);
  });

  const radialLine = d3.lineRadial()
   .radius(d=> d.value*radius)
   .angle((d,i)=> i*angleSlice)
   .curve(d3.curveLinearClosed);

  g.append("path")
   .datum(dataArr)
   .attr("fill","rgba(70,130,180,0.4)")
   .attr("stroke","steelblue")
   .attr("stroke-width",2)
   .attr("d", radialLine);

  g.selectAll(".radarCircle")
   .data(dataArr)
   .enter()
   .append("circle")
   .attr("r",4)
   .attr("cx",(d,i)=> d.value*radius*Math.cos(i*angleSlice -Math.PI/2))
   .attr("cy",(d,i)=> d.value*radius*Math.sin(i*angleSlice -Math.PI/2))
   .attr("fill","steelblue");
}

function loadHappinessDashboard() {
  document.getElementById('happiness-dashboard').style.display='block';

  d3.csv("World Happiness Report.csv").then(data=>{
    data.forEach(d=>{
      d.Year = +d.Year;
      for(const pred of RADAR_PREDICTORS){
        if(d[pred]!==undefined){
          d[pred] = +d[pred];
        }
      }
      d["Life Ladder"] = +d["Life Ladder"];
    });
    window.happinessDataDashboard = data;

    computePredictorExtents(data);

    const years = Array.from(new Set(data.map(d=> d.Year))).sort((a,b)=>a-b);
    const countries = Array.from(new Set(data.map(d=> d["Country Name"]))).sort();

    const countrySelect = d3.select("#happiness-country");
    countrySelect.selectAll("option").remove();
    countrySelect.selectAll("option")
     .data(countries)
     .enter()
     .append("option")
     .attr("value", d=>d)
     .text(d=>d);

    const yearSlider = document.getElementById("happiness-year-slider");
    const yearLabel  = document.getElementById("happiness-year-label");
    yearSlider.min=0;
    yearSlider.max= years.length-1;
    yearSlider.step=1;
    const defaultCountry = countries[0];
    const defaultYearIndex=0;
    yearSlider.value= defaultYearIndex;
    yearLabel.textContent= years[defaultYearIndex];

    updateHappinessDashboard(defaultCountry, years[defaultYearIndex]);

    yearSlider.addEventListener("input", function(){
      const idx= +this.value;
      const chosenYear = years[idx];
      yearLabel.textContent= chosenYear;
      const selectedCountry= d3.select("#happiness-country").property("value");
      updateHappinessDashboard(selectedCountry, chosenYear);
    });

    countrySelect.on("change", function(){
      const selectedCountry= this.value;
      const idx= +yearSlider.value;
      const chosenYear= years[idx];
      updateHappinessDashboard(selectedCountry, chosenYear);
    });
  }).catch(err=> console.error("Error loading happiness data:", err));
}

/**
 * Radar + gauge in updateHappinessDashboard
 */
function updateHappinessDashboard(country, year) {
  const data= window.happinessDataDashboard;
  const record= data.find(d=> d["Country Name"]===country && d.Year===year);
  if(!record) return;
  d3.select("#mainGauge").selectAll("*").remove();
  d3.select("#radarChart").selectAll("*").remove();

  drawGauge("#mainGauge", record["Life Ladder"], 10, {
    width:300, height:200, label:"Life Ladder", isMini:false
  });

  drawRadarChart(record, "#radarChart");
}

////////////////////////////////////////////////////////////////////////////////
// 7) "drawGauge" reused for Life Ladder
////////////////////////////////////////////////////////////////////////////////
function drawGauge(containerSelector, value, maxValue, options) {
  const width = options.width || 300,
        height= options.height||200,
        isMini= options.isMini|| false;
  const radius= Math.min(width,height)/2;
  const thickness= isMini? radius*0.3: radius*0.2;
  const startAngle= -Math.PI/2,
        endAngle= Math.PI/2;

  const container = d3.select(containerSelector);
  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${width/2},${height/2})`);

  // background arc
  const bgArc= d3.arc()
    .innerRadius(radius-thickness)
    .outerRadius(radius)
    .startAngle(startAngle)
    .endAngle(endAngle);

  g.append("path")
   .attr("d", bgArc)
   .attr("fill","#ddd");

  // normalized gauge value
  const normVal = Math.max(0, Math.min(1, value/maxValue));
  const gaugeAngle= startAngle + normVal*(endAngle - startAngle);

  const fgArc= d3.arc()
    .innerRadius(radius-thickness)
    .outerRadius(radius)
    .startAngle(startAngle)
    .endAngle(startAngle);

  const foreground = g.append("path")
    .attr("d", fgArc)
    .attr("fill", isMini?"#4A90E2":"#E74C3C");

  foreground.transition()
   .duration(1000)
   .attrTween("d", ()=>{
     const i= d3.interpolate(startAngle, gaugeAngle);
     return t=>{
       fgArc.endAngle(i(t));
       return fgArc();
     };
   });

  g.append("text")
    .attr("text-anchor","middle")
    .attr("dy","0.3em")
    .attr("font-size",isMini?"14px":"24px")
    .attr("fill","#333")
    .text(value.toFixed(1));

  if(!isMini){
    svg.append("text")
      .attr("x", width/2)
      .attr("y", height-10)
      .attr("text-anchor","middle")
      .attr("font-size","18px")
      .attr("fill","#333")
      .text(options.label||"Gauge");
  }
}


////////////////////////////////////////////////////////////////////////////////
// 8) Action Page → Charity Page
////////////////////////////////////////////////////////////////////////////////
document.getElementById('action-btn').addEventListener('click', () => {
  fadeOutAndShowActionPage();
});

function fadeOutAndShowActionPage() {
  const dash= document.getElementById('happiness-dashboard');
  dash.style.opacity=0;
  setTimeout(()=>{
    dash.style.display='none';
    const actionPage= document.getElementById('action-page');
    actionPage.style.display='block';
    actionPage.style.opacity=0;
    setTimeout(()=>{ actionPage.style.opacity=1; },50);
    const actionTitle= document.getElementById("action-title");
    typeWriter("Do something about it.", actionTitle,80,()=>{
      setTimeout(()=>{
        actionPage.style.opacity=0;
        setTimeout(()=>{
          actionPage.style.display='none';
          loadCharityPage();
        },500);
      },3000);
    });
  },800);
}

////////////////////////////////////////////////////////////////////////////////
// 9) Charity Page: forceSim with center stacking
////////////////////////////////////////////////////////////////////////////////
function loadCharityPage(){
  const charityPage= document.getElementById('charity-page');
  charityPage.style.display='block';
  d3.select("#charity-page").html("");

  const container= d3.select("#charity-page");
  container.append("h1")
    .attr("id","charity-title")
    .text("Make a difference.");

  const pageWidth= container.node().clientWidth;
  const pageHeight= container.node().clientHeight;

  const svgCharity= container.append("svg")
    .attr("width",pageWidth)
    .attr("height",pageHeight);

  const causes= Object.keys(charityMapping);
  let nodes= causes.map(cause=>({
    cause,
    r:40+ Math.random()*40,  // radius
    x: Math.random()*pageWidth,
    y: -50,
    url: charityMapping[cause]
  }));

  const bubbles= svgCharity.selectAll(".cause-bubble")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class","cause-bubble")
    .style("cursor","pointer");

  bubbles.append("circle")
    .attr("r", d=> d.r)
    .attr("fill","#E74C3C")
    .attr("stroke","#fff")
    .attr("stroke-width",2);

  bubbles.append("text")
    .text(d=> getShortLabel(d.cause))
    .attr("text-anchor","middle")
    .attr("dy","0.35em")
    .attr("fill","#fff")
    .attr("font-size","16px")
    .attr("font-weight",600);

  bubbles.on("click",(event,d)=>{
    const circle= d3.select(event.currentTarget).select("circle");
    circle.transition()
      .duration(300)
      .attr("r",0)
      .style("opacity",0)
      .on("end",()=>{
        d3.select(event.currentTarget).select("text")
          .transition().duration(300).style("opacity",0);
        setTimeout(()=> window.open(d.url,"_blank"),2000);
      });
  });

  const sim= d3.forceSimulation(nodes)
   .force("x", d3.forceX(pageWidth/2).strength(0.02))
   .force("y", d3.forceY(pageHeight/2).strength(0.02))
   .force("collide", d3.forceCollide().radius(d=> d.r+2).iterations(6))
   .velocityDecay(0.8)
   .alphaDecay(0.005)
   .on("tick", ()=>{
     bubbles.attr("transform", d=> `translate(${d.x},${d.y})`);
   });
  sim.alpha(1).restart();

  window.addEventListener("resize",()=>{
    const newW= container.node().clientWidth;
    const newH= container.node().clientHeight;
    svgCharity.attr("width", newW).attr("height", newH);
    sim.force("x", d3.forceX(newW/2).strength(0.02));
    sim.force("y", d3.forceY(newH/2).strength(0.02));
    sim.alpha(0.5).restart();
  });
}