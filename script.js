// ============================================================
// SETTINGS
// ============================================================

const margin = {
    top: 30,
    right: 40,
    bottom: 70,
    left: 80
};

const width = 1000;
const height = 560;

// Fixed y-axis range (°C). Data runs from about -1.13 to 4.07.
const Y_MIN = -1.5;
const Y_MAX = 4.5;

const innerWidth =
    width - margin.left - margin.right;

const innerHeight =
    height - margin.top - margin.bottom;


// ============================================================
// CREATE SVG
// ============================================================

const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%");


const chart = svg
    .append("g")
    .attr(
        "transform",
        `translate(${margin.left}, ${margin.top})`
    );


// ============================================================
// SCALES
// ============================================================

const xScale = d3
    .scaleLinear()
    .range([0, innerWidth]);


const yScale = d3
    .scaleLinear()
    .range([innerHeight, 0]);


// ============================================================
// AXIS GROUPS
// ============================================================

const xAxisGroup = chart
    .append("g")
    .attr(
        "transform",
        `translate(0, ${innerHeight})`
    )
    .attr("class", "axis");


const yAxisGroup = chart
    .append("g")
    .attr("class", "axis");


// ============================================================
// GRID
// ============================================================

const gridGroup = chart
    .append("g")
    .attr("class", "grid");


// ============================================================
// AXIS LABELS
// ============================================================

chart
    .append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 55)
    .attr("text-anchor", "middle")
    .text("Year");


chart
    .append("text")
    .attr("class", "axis-label")
    .attr(
        "transform",
        "rotate(-90)"
    )
    .attr("x", -innerHeight / 2)
    .attr("y", -55)
    .attr("text-anchor", "middle")
    .text("Temperature Change (°C)");


// ============================================================
// ZERO LINE
// ============================================================

const zeroLine = chart
    .append("line")
    .attr("stroke", "#94a3b8")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "5,5");


// ============================================================
// LINE GENERATOR
// ============================================================

const line = d3
    .line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.temp_change_c));


// ============================================================
// TOOLTIP
// ============================================================

const tooltip = d3.select("#tooltip");


// ============================================================
// HOVER: one tooltip for both scenarios, guide line, highlights
// ============================================================

const COLORS = {
    low: "#2563eb",
    high: "#f97316"
};

// Rows of the selected region, looked up by year
let lowByYear = new Map();
let highByYear = new Map();


const hoverGroup = chart
    .append("g")
    .attr("class", "hover-group")
    .style("display", "none")
    .style("pointer-events", "none");


const hoverLine = hoverGroup
    .append("line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#6b7280")
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4");


const hoverLow = hoverGroup
    .append("circle")
    .attr("r", 6)
    .attr("fill", "white")
    .attr("stroke", COLORS.low)
    .attr("stroke-width", 3);


const hoverHigh = hoverGroup
    .append("circle")
    .attr("r", 6)
    .attr("fill", "white")
    .attr("stroke", COLORS.high)
    .attr("stroke-width", 3);


// Invisible rectangle over the plot area that listens for the mouse
const hoverArea = chart
    .append("rect")
    .attr("class", "hover-area")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("mousemove", onHoverMove)
    .on("mouseleave", hideHover);


function hideHover() {
    hoverGroup.style("display", "none");
    tooltip.style("display", "none");
}


function formatChange(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)} °C`;
}


function tooltipRow(row, color) {
    return `
        <span style="
            display: inline-block;
            width: 11px;
            height: 11px;
            box-sizing: border-box;
            border-radius: 50%;
            background: white;
            border: 3px solid ${color};
            margin-right: 6px;
        "></span>${row.scenario_label}:
        ${formatChange(row.temp_change_c)}
    `;
}


function onHoverMove(event) {

    if (lowByYear.size === 0) return;

    // Read the cursor position horizontally and snap to the nearest year
    const [mouseX] = d3.pointer(event, this);
    const [minYear, maxYear] = xScale.domain();

    const year = Math.max(
        minYear,
        Math.min(maxYear, Math.round(xScale.invert(mouseX)))
    );

    const low = lowByYear.get(year);
    const high = highByYear.get(year);

    if (!low || !high) return;

    const x = xScale(year);

    hoverGroup.style("display", null);

    hoverLine
        .attr("x1", x)
        .attr("x2", x);

    hoverLow
        .attr("cx", x)
        .attr("cy", yScale(low.temp_change_c));

    hoverHigh
        .attr("cx", x)
        .attr("cy", yScale(high.temp_change_c));

    tooltip
        .style("display", "block")
        .html(`
            <strong>${low.region}</strong><br>
            Year: ${year}<br>
            ${tooltipRow(high, COLORS.high)}<br>
            ${tooltipRow(low, COLORS.low)}
        `);

    // Keep the tooltip inside the window
    const tooltipWidth = tooltip.node().offsetWidth;
    const rightEdge = document.documentElement.clientWidth - 10;

    let left = event.pageX + 15;
    if (left + tooltipWidth > rightEdge) {
        left = event.pageX - tooltipWidth - 15;
    }

    tooltip
        .style("left", `${left}px`)
        .style("top", `${event.pageY - 20}px`);
}


// ============================================================
// LOAD CSV
// ============================================================

d3.csv(
    "data/regional_temperature_fixed.csv",
    d => ({
        year: +d.year,

        region: d.region,

        scenario: d.scenario,

        scenario_label: d.scenario_label,

        temperature_c:
            +d.temperature_c,

        temp_change_c:
            +d.temp_change_c
    })
)
.then(data => {

    console.log(
        "Loaded climate data:",
        data.length,
        "rows"
    );

    // Initial chart
    updateChart(
        data,
        "North America",
        false
    );


    // ========================================================
    // REGION DROPDOWN
    // ========================================================

    d3
        .select("#region-select")
        .on("change", function () {

            const selectedRegion =
                this.value;

            updateChart(
                data,
                selectedRegion,
                true
            );

        });

})
.catch(error => {

    console.error(
        "Error loading climate data:",
        error
    );

    d3
        .select("#chart")
        .append("p")
        .text(
            "Error loading the climate dataset."
        );
});


// ============================================================
// UPDATE CHART
// ============================================================

function updateChart(
    data,
    region,
    animate = true
) {

    // --------------------------------------------------------
    // FILTER REGION
    // --------------------------------------------------------

    const regionData = data.filter(
        d => d.region === region
    );


    const lowData = regionData
        .filter(
            d => d.scenario === "ssp126"
        )
        .sort(
            (a, b) => a.year - b.year
        );


    const highData = regionData
        .filter(
            d => d.scenario === "ssp585"
        )
        .sort(
            (a, b) => a.year - b.year
        );


    // --------------------------------------------------------
    // UPDATE TITLE
    // --------------------------------------------------------

    d3
        .select("#chart-title")
        .text(
            `Projected Temperature Change — ${region}`
        );


    // --------------------------------------------------------
    // UPDATE SCALES
    // --------------------------------------------------------

    xScale.domain(
        d3.extent(
            regionData,
            d => d.year
        )
    );


    // Fixed y-axis so every region uses the same scale
    yScale.domain([Y_MIN, Y_MAX]);


    // --------------------------------------------------------
    // AXES
    // --------------------------------------------------------

    const xAxis = d3
        .axisBottom(xScale)
        .tickFormat(
            d3.format("d")
        )
        .ticks(9);


    const yAxis = d3
        .axisLeft(yScale)
        .ticks(8);


    if (animate) {

        xAxisGroup
            .transition()
            .duration(600)
            .call(xAxis);


        yAxisGroup
            .transition()
            .duration(600)
            .call(yAxis);

    } else {

        xAxisGroup.call(xAxis);
        yAxisGroup.call(yAxis);

    }


    // --------------------------------------------------------
    // GRID
    // --------------------------------------------------------

    gridGroup.call(
        d3
            .axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat("")
            .ticks(8)
    );


    // --------------------------------------------------------
    // ZERO LINE
    // --------------------------------------------------------

    zeroLine
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr(
            "y1",
            yScale(0)
        )
        .attr(
            "y2",
            yScale(0)
        );


    // --------------------------------------------------------
    // DRAW LINES
    // --------------------------------------------------------

    drawScenarioLine(
        lowData,
        "low",
        "low-line",
        animate
    );


    drawScenarioLine(
        highData,
        "high",
        "high-line",
        animate
    );


    // --------------------------------------------------------
    // HOVER DATA
    // --------------------------------------------------------

    lowByYear = new Map(lowData.map(d => [d.year, d]));
    highByYear = new Map(highData.map(d => [d.year, d]));

    hideHover();

    // Keep the hover layers on top of the lines
    hoverGroup.raise();
    hoverArea.raise();

}


// ============================================================
// DRAW / UPDATE A SCENARIO LINE
// ============================================================

function drawScenarioLine(
    scenarioData,
    id,
    className,
    animate
) {

    const selection = chart
        .selectAll(
            `.scenario-${id}`
        )
        .data([scenarioData]);


    const entered = selection
        .enter()
        .append("path")
        .attr(
            "class",
            `temperature-line ${className} scenario-${id}`
        );


    const merged =
        entered.merge(selection);


    if (animate) {

        merged
            .transition()
            .duration(600)
            .attr(
                "d",
                line
            );

    } else {

        merged.attr(
            "d",
            line
        );

    }

}