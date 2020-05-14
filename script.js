(() => {
  const readFile = (file, callback) => {
    const reader = new FileReader();
    reader.addEventListener('load', (e) => {
      callback(e.target.result);
    });
    reader.readAsText(file);
  };

  const normalizeNumberString = (number = '0') => Number(number.replace(',', ''));

  const padNumber = (number, suffix) => {
    const paddedNumber = ("000000000" + Math.abs(number)).slice(-9);
    return `${paddedNumber}${suffix || (number > 0 ? '-' : '+')}`;
  };

  let sourceData;
  let outputData;
  let outputDataString;

  const printOutput = (textarea) => {
    sourceData.forEach(({
      tenantName,
      total,
      balance,
    }) => {
      const tenantLines = outputData.filter((line) => line && line[1] && line[1].includes(tenantName));
      if (tenantLines.length > 0) {
        if (tenantLines.length > 1) {
          console.warn('Multiple matches found for', tenantName);
        } else {
          const [tenantLine] = tenantLines;
          const paymentLine = tenantLine[2];
          const payments = paymentLine.split('+');
          payments[2] = padNumber(total, '+');
          payments[3] = padNumber(balance);
          const newPaymentLine = (
            payments
              .join('+')
              .replace(/\+\+/g, '+')
              .replace(/-\+/g, '-')
          );
          outputDataString = outputDataString.replace(paymentLine, newPaymentLine);
        }
      }
    });

    if (textarea) {
      textarea.value = outputDataString;
    } else {
      console.log(outputDataString);
    }
  };

  const sourceFileInput = document.getElementById('sourceFile');
  const dataFileInput = document.getElementById('dataFile');
  const outputTextarea = document.getElementById('output');

  sourceFileInput.addEventListener('change', (e) => {
    const [file] = e.target.files;
    readFile(file, (result) => {
      const { data } = Papa.parse(result, {
        delimiter: ';',
        header: true,
      });
      console.log(data[0]);
      sourceData = data.map(({
        TenantName,
        Total,
        Balance,
      }) => ({
        tenantName: TenantName,
        total: normalizeNumberString(Total),
        balance: normalizeNumberString(Balance),
      }));

      if (sourceData && outputData) {
        printOutput(outputTextarea);
      }
    });
  });

  dataFileInput.addEventListener('change', (e) => {
    const [file] = e.target.files;
    readFile(file, (result) => {
      outputDataString = result;
      outputData = (
        outputDataString
          .split('\r\n')
          .map((line) => line.split(/\  +/))
      );
      outputData.shift();

      if (sourceData && outputData) {
        printOutput(outputTextarea);
      }
    });
  });
})();
