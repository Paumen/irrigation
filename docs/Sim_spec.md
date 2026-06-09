review below spec and attached implementation plan.

Irrigation System Simulator — High-Level Spec
A simulator of the real irrigation system's hydraulics and its control wiring: for any combination of commands and faults, it shows where water sits, at what pressure, and where and how much leaves.
States
The system occupies one state at a time, defined by the controller's commands, the position of every manual control, and any faults present.
The pump is physically running or off, and each valve and head outlet is physically open or closed, in any combination.
The electrical circuit to the pump and to each solenoid is either intact or broken.
Any element may be healthy or carry a fault — hydraulic (clog, leak, weak pump) or electrical (no signal, broken wire, dead solenoid).
Logic
For any state, the model computes physically realistic pressure and flow throughout the network.
How much water each open outlet releases depends on the pressure reaching it.
A valve opens when its solenoid is energised through healthy wiring or when its manual bleed is opened, while the pump runs only when commanded through healthy wiring.
Opening or closing valves redistributes pressure and flow across the whole system.
A fault behaves realistically: a clog restricts flow, a leak lets water escape, a weak pump delivers less, and an electrical fault stops the valve or pump it feeds from actuating.
Water leaves only through open outlets and leaks, and total outflow matches what the pump supplies.
UI
The system is shown as a diagram.
The control wiring is shown: what is commanded on, what is energised, and where a path is broken.
Pressure and flow are shown wherever they occur, with filled parts distinguished from empty ones.
Every point where water leaves the system is shown, along with how much.
The user can command every control — pump, valves, head flo-stop, valve flow control — and inject faults.
The view updates live as the state changes.
