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


    const yExtent = d3.extent(
        regionData,
        d => d.temp_change_c
    );


    const padding = 0.4;


    yScale.domain([
        Math.min(
            yExtent[0] - padding,
            -0.5
        ),

        yExtent[1] + padding
    ]);


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
    // HOVER POINTS
    // --------------------------------------------------------

    const allPoints =
        regionData;


    const circles = chart
        .selectAll(".hover-point")
        .data(
            allPoints,
            d =>
                `${d.scenario}-${d.year}`
        );


    circles.exit().remove();


    circles
        .enter()
        .append("circle")
        .attr(
            "class",
            "hover-point"
        )
        .attr("r", 7)
        .attr("fill", "transparent")
        .merge(circles)
        .attr(
            "cx",
            d => xScale(d.year)
        )
        .attr(
            "cy",
            d =>
                yScale(
                    d.temp_change_c
                )
        )
        .on(
            "mouseover",
            function (event, d) {

                tooltip
                    .style(
                        "display",
                        "block"
                    )
                    .html(`
                        <strong>${d.region}</strong><br>
                        Year: ${d.year}<br>
                        ${d.scenario_label}<br>
                        Change:
                        ${d.temp_change_c.toFixed(2)} °C
                    `);

            }
        )
        .on(
            "mousemove",
            function (event) {

                tooltip
                    .style(
                        "left",
                        `${event.pageX + 15}px`
                    )
                    .style(
                        "top",
                        `${event.pageY - 20}px`
                    );

            }
        )
        .on(
            "mouseout",
            function () {

                tooltip
                    .style(
                        "display",
                        "none"
                    );

            }
        );

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