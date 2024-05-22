// givenDim, expectedDim: { width: number, height: number }
function isSameAspectRatio(givenDim, expectedDim, threshold = 0.1) {
  const givenRatio = givenDim.width / givenDim.height;
  const expectedRatio = expectedDim.width / expectedDim.height;
  return Math.abs(givenRatio - expectedRatio) < threshold;
}
