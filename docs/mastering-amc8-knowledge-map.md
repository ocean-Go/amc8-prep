# Mastering AMC 8 — Complete Knowledge Map & Formula Bank

This document distills the uploaded **Mastering AMC 8** book into a structured study system for AMC 8 preparation. It is a learning map and formula index, not a reproduction of the source book.

## 1. Overall Structure

The book is organized into:

- **5 study domains**
  1. Combinatorics
  2. Algebra
  3. Number Theory
  4. Geometry
  5. Additional Techniques & Strategies
- **30 instructional chapters**
- A final bridge chapter toward **AMC 10/12**

---

# 2. Complete Chapter Knowledge Map

## Domain A — Combinatorics

### Chapter 1. Permutations
- Permutations definition
- Factorials
- Permutations fundamentals
- Digit permutations
- Circular arrangements

### Chapter 2. Combinations
- Combinations fundamentals
- Binomial identity
- Tricky combinations examples

### Chapter 3. Word Rearrangements
- Word rearrangements fundamentals
- Repeated letters
- Rearrangements with constraints

### Chapter 4. Probability
- Probability fundamentals
- Distinguishability
- Casework in probability
- Probability of independent events
- Probability of dependent events
- Dependent vs. independent recognition

### Chapter 5. Casework
- Casework fundamentals
- Harder casework examples

### Chapter 6. Complementary Counting
- Complementary counting fundamentals
- Complementary counting with casework

### Chapter 7. Principle of Inclusion-Exclusion (PIE)
- PIE strategies
- PIE for 2 events
- PIE for 3 events
- PIE for any number of events

### Chapter 8. Stars and Bars
- Stars and bars fundamentals
- Stars and bars with constraints

### Chapter 9. Geometric Counting
- Geometric counting fundamentals
- Number of squares in a grid
- Number of rectangles in a grid
- Path counting

### Chapter 10. Recursion
- Recursion fundamentals
- Recursion with constraints
- Probability recursions

---

## Domain B — Algebra

### Chapter 11. Ratios and Percentages
- Ratios fundamentals
- Rate and work

### Chapter 12. Algebraic Manipulations and Equations
- System of equations basics
- Advanced equation solving techniques
- Word problems

### Chapter 13. Speed, Distance, and Time
- Distance-rate-time models
- Relative speed
- Catch-up and meeting problems

### Chapter 14. Sequences and Series
- Arithmetic sequences
- Special series
- Geometric sequences
- Arithmetico-geometric sequence

### Chapter 15. Mean, Median, Mode
- Mean, median, mode fundamentals
- Mean/median/mode condition examples

### Chapter 16. Telescoping
- Telescoping basics
- Telescoping sums
- Telescoping products
- Telescoping equations

---

## Domain C — Number Theory

### Chapter 17. Primes and Divisibility
- Prime numbers
- Divisibility rules
- Prime factorization
- Legendre’s formula

### Chapter 18. Factors
- Number of factors
- Sum of factors
- Product of factors

### Chapter 19. GCD and LCM
- GCD and LCM fundamentals
- GCD-LCM product relationship
- Additional GCD/LCM properties
- Euclidean algorithm

### Chapter 20. Modular Arithmetic
- Modular arithmetic fundamentals
- Product rule
- Exponent rule
- Multiple modular congruences
- Digit cycles

### Chapter 21. Diophantine Equations
- Quadratic factorizations
- Simon’s Favorite Factoring Trick
- Interesting Diophantine examples
- Cubic factorizations

### Chapter 22. Miscellaneous Number Theory
- Palindromes
- Money problems
- Integer operations
- Chicken McNugget theorem

---

## Domain D — Geometry

### Chapter 23. Angle Chasing
- Angle chasing basics
- Inscribed angles
- Polygons
- Advanced circle angle chasing theorems

### Chapter 24. Triangles
- Area of a triangle
- Special triangles
- Equilateral triangle
- 45-45-90 triangle
- 30-60-90 triangle
- 13-14-15 triangle
- Pythagorean theorem
- Triangle properties
- Angle bisector theorem

### Chapter 25. Quadrilaterals
- Square
- Rectangle
- Rhombus
- Parallelogram
- Trapezoid
- Breaking quadrilaterals into triangles

### Chapter 26. Circles
- Circle properties
- Circular area
- Length inside circles

### Chapter 27. Similar Triangles
- Congruent triangles
- Similar triangles

### Chapter 28. Area and Length of Complex Shapes
- Hexagon
- Octagon
- Area of complex shapes
- Length of complex shapes

### Chapter 29. 3D Geometry
- Cube
- Prism
- Pyramid
- Cylinder
- Cone
- Sphere
- Similar triangles in 3D

---

## Domain E — Additional Techniques & Strategy

### Chapter 30. Additional Techniques and Strategies
- Meta-solving techniques
- Silly mistakes
- Other strategies to maximize score

### Chapter 31. Mastering AMC 10/12
- Next-stage learning direction after AMC 8

---

# 3. Formula Bank

## A. Combinatorics

### 1. Factorial
- `n! = n × (n - 1) × ... × 2 × 1`
- `0! = 1`

### 2. Permutations
- `P(n,k) = n! / (n-k)!`

### 3. Circular Arrangements
- Rotations identified: `(n - 1)!`
- Rotations and reflections identified: `(n - 1)! / 2`

### 4. Combinations
- `C(n,k) = n! / (k!(n-k)!)`
- `C(n,k) = C(n,n-k)`

### 5. Binomial Identity
- `C(n,0) + C(n,1) + ... + C(n,n) = 2^n`

### 6. Word Rearrangements with Repeated Letters
- `n! / (a!b!c!...)`

### 7. Basic Probability
- `P(A) = favorable outcomes / total outcomes`

### 8. Complement Rule
- `P(A^c) = 1 - P(A)`

### 9. Independent Events
- `P(A ∩ B) = P(A)P(B)`

### 10. Dependent Events
- `P(A ∩ B) = P(A)P(B|A)`

### 11. Casework Counting
- `Total = Case 1 + Case 2 + ...`

### 12. Complementary Counting
- `Desired = Total - Undesired`

### 13. Inclusion-Exclusion for 2 Sets
- `|A ∪ B| = |A| + |B| - |A ∩ B|`

### 14. Inclusion-Exclusion for 3 Sets
- `|A ∪ B ∪ C| = |A| + |B| + |C| - |A ∩ B| - |A ∩ C| - |B ∩ C| + |A ∩ B ∩ C|`

### 15. Stars and Bars
- Nonnegative integer solutions to `x1 + ... + xk = n`:
  - `C(n+k-1, k-1)`
- Positive integer solutions:
  - `C(n-1, k-1)`

### 16. Rectangles in a Grid
- In an `m × n` grid:
  - `C(m+1,2) × C(n+1,2)`

### 17. Shortest Lattice Paths
- With `r` right steps and `u` up steps:
  - `C(r+u,r) = C(r+u,u)`

### 18. Recurrence Mindset
- `a_n` is expressed using earlier terms such as `a_{n-1}`, `a_{n-2}`

---

## B. Algebra

### 19. Percent
- `Percent = (part / whole) × 100%`

### 20. Ratio Equivalence
- `a/b = c/d  ⇔  ad = bc`

### 21. Combined Work
- `1/T = 1/T1 + 1/T2 + ...`

### 22. Linear Equation
- From `ax + b = c`:
  - `x = (c-b)/a`

### 23. Distributive Property
- `a(b+c) = ab + ac`

### 24. Distance-Rate-Time
- `d = rt`
- `r = d/t`
- `t = d/r`

### 25. Average Speed
- `average speed = total distance / total time`

### 26. Relative Speed
- Opposite directions: add speeds
- Same direction: subtract speeds

### 27. Arithmetic Sequence nth Term
- `a_n = a_1 + (n-1)d`

### 28. Arithmetic Series Sum
- `S_n = n(a_1 + a_n)/2`

### 29. Geometric Sequence nth Term
- `a_n = a_1 r^(n-1)`

### 30. Finite Geometric Series
- `S_n = a_1(1-r^n)/(1-r)`, for `r ≠ 1`

### 31. Sum of First n Integers
- `1 + 2 + ... + n = n(n+1)/2`

### 32. Mean
- `mean = sum of values / number of values`
- `total = mean × count`

### 33. Weighted Mean
- `weighted mean = Σ(weight × value) / Σ(weight)`

### 34. Telescoping Fraction Pattern
- `1/[k(k+1)] = 1/k - 1/(k+1)`

### 35. Telescoping Sum Example
- `Σ 1/[k(k+1)] from k=1 to n = 1 - 1/(n+1)`

---

## C. Number Theory

### 36. Prime Factorization
- `n = p1^a1 × p2^a2 × ... × pk^ak`

### 37. Legendre’s Formula
- `v_p(n!) = floor(n/p) + floor(n/p^2) + floor(n/p^3) + ...`

### 38. Number of Divisors
- If `n = p1^a1 × ... × pk^ak`, then:
  - `d(n) = (a1+1)(a2+1)...(ak+1)`

### 39. Sum of Divisors
- `σ(n) = Π[(p_i^(a_i+1)-1)/(p_i-1)]`

### 40. Product of Divisors
- `n^(d(n)/2)`

### 41. GCD-LCM Product
- `gcd(a,b) × lcm(a,b) = ab`

### 42. Euclidean Algorithm
- `gcd(a,b) = gcd(b, a mod b)`

### 43. Congruence Definition
- `a ≡ b (mod m)  ⇔  m | (a-b)`

### 44. Modular Addition and Multiplication
- If `a ≡ b (mod m)` and `c ≡ d (mod m)`:
  - `a+c ≡ b+d (mod m)`
  - `ac ≡ bd (mod m)`

### 45. Digit Cycles
- Track periodic residues of powers modulo `m`

### 46. Simon’s Favorite Factoring Trick
- `xy + ax + by = n`
- Equivalent factorization:
  - `(x+b)(y+a) = n + ab`

### 47. Difference of Squares
- `x^2 - y^2 = (x-y)(x+y)`

### 48. Chicken McNugget Theorem
- For coprime positive integers `a,b`, the largest nonrepresentable number of the form `ax+by` is:
  - `ab - a - b`

---

## D. Geometry

### 49. Triangle Angle Sum
- `A + B + C = 180°`

### 50. Polygon Interior Angle Sum
- `(n-2) × 180°`

### 51. Inscribed Angle Theorem
- `inscribed angle = 1/2 × intercepted arc`

### 52. Triangle Area
- `A = (1/2)bh`

### 53. Pythagorean Theorem
- `a^2 + b^2 = c^2`

### 54. 45-45-90 Triangle
- Side ratio: `1 : 1 : √2`

### 55. 30-60-90 Triangle
- Side ratio: `1 : √3 : 2`

### 56. Angle Bisector Theorem
- `BD/DC = AB/AC`

### 57. Rectangle Area
- `A = lw`

### 58. Parallelogram Area
- `A = bh`

### 59. Trapezoid Area
- `A = (1/2)(b1+b2)h`

### 60. Rhombus Area Using Diagonals
- `A = (1/2)d1d2`

### 61. Circle Area
- `A = πr^2`

### 62. Circle Circumference
- `C = 2πr = πd`

### 63. Arc Length
- `L = (θ/360°) × 2πr`

### 64. Sector Area
- `A = (θ/360°) × πr^2`

### 65. Similar Triangles — Length Scale
- Corresponding side lengths share one common ratio `k`

### 66. Similar Triangles — Area Scale
- `area ratio = k^2`

### 67. Complex Shape Decomposition
- `Total area = sum of parts - removed regions`

### 68. Cube Volume
- `V = s^3`
- Surface area: `6s^2`

### 69. Prism Volume
- `V = Bh`

### 70. Pyramid Volume
- `V = (1/3)Bh`

### 71. Cylinder Volume
- `V = πr^2h`

### 72. Cone Volume
- `V = (1/3)πr^2h`

### 73. Sphere Volume
- `V = (4/3)πr^3`

### 74. Sphere Surface Area
- `SA = 4πr^2`

---

# 4. Recommended Study Method

A practical AMC 8 sequence:

1. **Foundation layer**
   - Permutations, combinations, ratios, algebra basics, divisibility, basic triangles and circles
2. **Scoring power layer**
   - Probability, PIE, stars and bars, GCD/LCM, modular arithmetic, special triangles, similarity
3. **Contest edge layer**
   - Recursion, telescoping, Diophantine equations, complex figures, 3D geometry, strategy chapters

---

# 5. Website Implementation

The interactive web study hub lives at:

- `public/mastering-amc8/index.html`
- `public/mastering-amc8/styles.css`
- `public/mastering-amc8/data.js`
- `public/mastering-amc8/app.js`

Main features:

- Searchable chapter map
- Searchable formula bank
- Progress tracking by chapter
- Formula flashcard sprint
- Mini retrieval quiz
