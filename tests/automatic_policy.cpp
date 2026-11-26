#include <cassert>
#include "../firmware/src/automatic_policy.h"
int main() {
  AutomaticPolicy p;
  assert(!p.ready(0, true, false, 1000, 40)); // Nunca arrancar en seco tras reinicio.
  assert(!p.ready(60, true, false, 2000, 40));
  assert(p.armed);
  assert(!p.ready(20, true, false, 3000, 40));
  assert(!p.ready(20, true, false, 62000, 40));
  assert(p.ready(20, true, false, 63000, 40));
  p.started(20, 63000);
  assert(!p.ready(20, true, false, 100000, 40));
  assert(!p.ready(20, true, false, 243000, 40));
  assert(p.locked); // Sin respuesta del suelo: no repetir.
  AutomaticPolicy q;
  q.ready(60, true, false, 1000, 40);
  q.ready(20, true, false, 2000, 40);
  q.started(20, 62000);
  q.ready(23, true, false, 242000, 40);
  assert(!q.locked);
  assert(!q.ready(23, true, false, 961999, 40));
  assert(q.ready(23, true, false, 962000, 40));
  q.suspend();
  assert(!q.ready(0, true, false, 2000000, 40));
  AutomaticPolicy r;
  r.armed = true; r.cycles = 3;
  assert(!r.ready(0, true, false, 4000000, 40));
  return 0;
}
