# The mathematics inside the scene

## 1. From one person to a visible point

Each person has one ID and exactly one activity at a selected minute. The data model
answers the activity question first. Layout then decides where that person's point
should sit in the corresponding group. Changing a visual parameter does not alter
the number of people.

## 2. Sunflower geometry

For a point numbered `i` inside a group:

```js
angle = i * 2.399963229728653;
distance = radius * Math.sqrt((i + 0.5) / count);
x = centerX + Math.cos(angle) * distance;
y = centerY + Math.sin(angle) * distance;
```

The approximately 137.5-degree golden angle spreads successive points without
stacking them into a few spokes. `cos` and `sin` turn angle and distance into x and y.
The square root matters because a disc's area grows with the square of its radius.
Taking a square root gives approximately uniform point density.

Circular group radius is `maxRadius * sqrt(count / total)`. A quarter of the people
therefore use half the radius and a quarter of the disc area. Work uses a grid and
travel uses three lanes instead; compare those categories using their points/counts,
not by treating every category's outline as the same kind of area chart.

## 3. Smooth, curved journeys

For start point A, control points B and C, and destination D, the cubic Bézier formula is:

```text
P(t) = (1-t)^3 A + 3(1-t)^2 t B + 3(1-t)t^2 C + t^3 D
```

At t=0 the point is exactly at A; at t=1 it is exactly at D. The controls steer the
curve. The perpendicular unit vector `(-dy / length, dx / length)` shifts the
controls sideways without changing the endpoints. GSAP eases progress from 0 to 1.

The curves are visual choreography, not geographic paths. The model's Travelling
category is distinct from the animated journey between two snapshots.

## 4. Settling and interpolation

Linear interpolation is `a + (b - a) * t`. It moves between coordinates or colour
channels. For a person staying within a group while its layout changes, a fraction
of the remaining distance is applied on each frame. Multiplying that fraction by
frame duration prevents a high-refresh display from making the settling much faster.

The simulation caps unusually large frame durations and suspends while hidden, so
returning to the tab does not unexpectedly skip hours.

## 5. Cyclic time and conservation

Time wraps with `((minute % 1440) + 1440) % 1440`, including negative input. Schedules
use mutually exclusive intervals. Every person contributes one count, so the sum
across activities is always 1,000. This invariant is tested for every minute of a day.
