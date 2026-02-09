d3.csv('data/sales.csv')
    .then(data => {
        data.forEach(d => {
            d.sales = +d.sales;
        });

        const barchart = new BarChart({ parentElement: '#barchart'}, data);

        barchart.updateVis();
    })
    .catch(error => {
        console.error('error loading the data: ', error);
    });